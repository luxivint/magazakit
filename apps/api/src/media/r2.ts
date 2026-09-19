import { createHash, createHmac } from 'node:crypto';

export type R2Config = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  region: string;
};

export function readR2Config(
  env: NodeJS.ProcessEnv = process.env,
): R2Config | null {
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();
  const endpoint = env.R2_S3_ENDPOINT?.trim();
  const publicBaseUrl = env.R2_PUBLIC_BASE_URL?.trim();
  const bucket = env.R2_BUCKET?.trim() || 'magazakit';
  if (!accessKeyId || !secretAccessKey || !endpoint || !publicBaseUrl) {
    return null;
  }
  return {
    endpoint: endpoint.replace(/\/$/, ''),
    bucket,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: publicBaseUrl.replace(/\/$/, ''),
    region: env.R2_REGION?.trim() || 'auto',
  };
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256Hex(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

function amzDate(now = new Date()): { amzDate: string; dateStamp: string } {
  const iso = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

export function signR2Put(input: {
  config: R2Config;
  key: string;
  body: Buffer;
  contentType: string;
  now?: Date;
}): { url: URL; headers: Record<string, string> } {
  const { config, key, body, contentType } = input;
  const url = new URL(`/${config.bucket}/${key.split('/').map(encodeURIComponent).join('/')}`, config.endpoint);
  const { amzDate: date, dateStamp } = amzDate(input.now);
  const payloadHash = sha256Hex(body);
  const host = url.host;
  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${date}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [
    'PUT',
    url.pathname,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const scope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    date,
    scope,
    sha256Hex(canonicalRequest),
  ].join('\n');
  const kDate = hmac(`AWS4${config.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, config.region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = hmac(kSigning, stringToSign).toString('hex');
  return {
    url,
    headers: {
      'Content-Type': contentType,
      Host: host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': date,
      Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
}

export async function putR2Object(
  config: R2Config,
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const signed = signR2Put({ config, key, body, contentType });
  const res = await fetch(signed.url, {
    method: 'PUT',
    headers: signed.headers,
    body,
  });
  if (!res.ok) {
    throw new Error(`R2 PUT ${res.status}`);
  }
  return `${config.publicBaseUrl}/${key}`;
}

export function objectKeyForListing(
  orgId: string,
  listingId: string,
  contentType: string,
  sourceUrl: string,
): string {
  const ext =
    contentType.includes('png')
      ? 'png'
      : contentType.includes('webp')
        ? 'webp'
        : contentType.includes('gif')
          ? 'gif'
          : sourceUrl.toLowerCase().includes('.png')
            ? 'png'
            : 'jpg';
  const safeId = listingId.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const safeOrg = orgId.replace(/[^a-zA-Z0-9._-]+/g, '_');
  return `catalog/${safeOrg}/${safeId}.${ext}`;
}

export function isR2PublicUrl(config: R2Config, url: string): boolean {
  return url.startsWith(`${config.publicBaseUrl}/`);
}
