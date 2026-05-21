import 'reflect-metadata';
// Load .env before module initialisation so REDIS_URL / JWT_SECRET are available
// when RedisModule.forRoot() and JwtModule.register() read process.env.
import { config } from 'dotenv';
config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // HTTP CORS — Socket.IO CORS is configured in @WebSocketGateway decorator
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  });

  const port = process.env.REALTIME_SERVICE_PORT ?? '3004';
  await app.listen(port);

  console.log(`Realtime service running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start realtime-service:', err);
  process.exit(1);
});
