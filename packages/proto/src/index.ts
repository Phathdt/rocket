/**
 * @rocket/proto — gRPC contract for the Driver service.
 *
 * Re-exports ts-proto generated types/constants for the
 * `rocket.driver.v1.DriverService` contract.
 *
 * NestJS consumers:
 *  - Server (Phase 2): implement `DriverServiceController` +
 *    decorate the class with `@DriverServiceControllerMethods()`.
 *  - Client (Phase 3): inject `DriverServiceClient` via `@Client`/`ClientGrpc`.
 *
 * The raw `.proto` file (needed by `GrpcOptions.protoPath`) is resolvable at
 * runtime: `require.resolve('@rocket/proto/proto/rocket/driver/v1/driver.proto')`.
 */
export * from './generated/rocket/driver/v1/driver';

import { join } from 'node:path';

/** Absolute path to the bundled driver.proto file (for `GrpcOptions.protoPath`). */
export const DRIVER_PROTO_PATH = join(
  __dirname,
  '..',
  'proto',
  'rocket',
  'driver',
  'v1',
  'driver.proto',
);
