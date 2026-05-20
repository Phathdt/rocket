import 'reflect-metadata';
// Load .env before any module initialisation so REDIS_URL etc. are available
// when RedisModule.forRoot() reads process.env during module metadata setup.
import { config } from 'dotenv';
config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
    credentials: true,
  });

  const port = process.env.GATEWAY_PORT ?? '3000';
  await app.listen(port);

  console.log(`API Gateway running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start gateway:', err);
  process.exit(1);
});
