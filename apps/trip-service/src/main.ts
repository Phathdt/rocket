import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalPipes(new ZodValidationPipe());

  const port = process.env.TRIP_SERVICE_PORT ?? 3003;
  await app.listen(port);
  console.log(`Trip service running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start trip service:', err);
  process.exit(1);
});
