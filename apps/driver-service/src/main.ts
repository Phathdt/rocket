import { NestFactory } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ZodValidationPipe());
  app.enableCors();

  const port = process.env.DRIVER_SERVICE_PORT ?? 3002;
  await app.listen(port);
  console.log(`Driver service running on port ${port}`);
}

bootstrap();
