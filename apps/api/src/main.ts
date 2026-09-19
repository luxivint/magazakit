import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { assertCredentialsEncryptionKey } from './channels/crypto';
import { corsOptions } from './config/cors';
import { loadEnvFiles } from './config/load-env';

function applyTrustProxy(app: Awaited<ReturnType<typeof NestFactory.create>>): void {
  const raw = process.env.TRUST_PROXY?.trim();
  if (!raw) return;
  const instance = app.getHttpAdapter().getInstance() as {
    set: (key: string, value: unknown) => void;
  };
  if (raw === 'true' || raw === '1') {
    instance.set('trust proxy', 1);
    return;
  }
  if (/^\d+$/.test(raw)) {
    instance.set('trust proxy', Number(raw));
    return;
  }
  instance.set(
    'trust proxy',
    raw.split(',').map((s) => s.trim()).filter(Boolean),
  );
}

async function bootstrap() {
  loadEnvFiles();
  assertCredentialsEncryptionKey();
  const app = await NestFactory.create(AppModule);
  applyTrustProxy(app);
  app.enableCors(corsOptions());
  const port = Number(process.env.PORT ?? 43140);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
