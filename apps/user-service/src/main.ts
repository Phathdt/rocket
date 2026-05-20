import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalPipes(new ZodValidationPipe());

  const port = process.env.USER_SERVICE_PORT ?? '3001';
  await app.listen(port);

  console.log(`User service running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start user service:', err);
  process.exit(1);
});
