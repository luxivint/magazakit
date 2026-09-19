const { getDefaultConfig } = require('expo/metro-config');
const http = require('http');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const API_PROXY = process.env.EXPO_API_PROXY ?? 'http://127.0.0.1:43140';

const config = getDefaultConfig(projectRoot);
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

const nativeFirebase = ['@react-native-firebase/app', '@react-native-firebase/messaging'];
const upstreamResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    nativeFirebase.some((pkg) => moduleName === pkg || moduleName.startsWith(`${pkg}/`))
  ) {
    return { type: 'empty' };
  }
  if (upstreamResolve) {
    return upstreamResolve(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

function shouldProxy(url) {
  const p = String(url ?? '').split('?')[0];
  return p === '/health' || p.startsWith('/v1/') || p === '/v1';
}

function proxyApi(req, res) {
  const target = new URL(API_PROXY);
  const headers = { ...req.headers, host: target.host };
  delete headers['content-length'];
  const upstream = http.request(
    {
      hostname: target.hostname,
      port: target.port || 80,
      path: req.url,
      method: req.method,
      headers,
    },
    (incoming) => {
      res.writeHead(incoming.statusCode || 502, incoming.headers);
      incoming.pipe(res);
    },
  );
  upstream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'content-type': 'application/json' });
    }
    res.end(JSON.stringify({ error: { code: 'CHANNEL_UNAVAILABLE', message: 'API proxy 502' } }));
  });
  req.pipe(upstream);
}

const previousEnhance = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware, server) => {
    const inner = previousEnhance ? previousEnhance(metroMiddleware, server) : metroMiddleware;
    return (req, res, next) => {
      if (shouldProxy(req.url)) {
        proxyApi(req, res);
        return;
      }
      return inner(req, res, next);
    };
  },
};

module.exports = config;
