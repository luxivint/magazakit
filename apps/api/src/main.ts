import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { corsOptions } from './config/cors';
import { loadEnvFiles } from './config/load-env';

async function bootstrap() {
  loadEnvFiles();
  const app = await NestFactory.create(AppModule);
  app.enableCors(corsOptions());
  const port = Number(process.env.PORT ?? 43140);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
