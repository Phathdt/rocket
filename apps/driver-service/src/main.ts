import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ZodValidationPipe } from 'nestjs-zod';
import { DRIVER_PROTO_PATH } from '@rocket/proto';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ZodValidationPipe());
  app.enableCors();

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'rocket.driver.v1',
      protoPath: DRIVER_PROTO_PATH,
      url: process.env.DRIVER_GRPC_URL ?? '0.0.0.0:50051',
      loader: {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      },
    },
  });

  await app.startAllMicroservices();

  const port = process.env.DRIVER_SERVICE_PORT ?? 3002;
  await app.listen(port);
  console.log(`Driver service REST running on port ${port}`);
  console.log(`Driver service gRPC running on ${process.env.DRIVER_GRPC_URL ?? '0.0.0.0:50051'}`);
}

bootstrap();
