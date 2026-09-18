import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'x-request-id', 'X-Request-Id'],
    exposedHeaders: ['x-request-id'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  const port = Number(process.env.PORT ?? 43140);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
