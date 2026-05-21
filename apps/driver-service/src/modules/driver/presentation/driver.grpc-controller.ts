import { Controller } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import {
  DriverServiceController,
  DriverServiceControllerMethods,
  FindNearbyRequest,
  FindNearbyResponse,
  AssignRequest,
  AssignResponse,
  ReleaseRequest,
  ReleaseResponse,
} from '@rocket/proto';
import {
  DriverAlreadyExistsError,
  DriverNotAvailableError,
  DriverNotFoundError,
} from '../domain/errors';
import { IDriverService } from '../domain/interfaces/driver.service';

function toRpcException(err: unknown): RpcException {
  if (err instanceof DriverNotFoundError) {
    return new RpcException({ code: status.NOT_FOUND, message: err.message });
  }
  if (err instanceof DriverAlreadyExistsError) {
    return new RpcException({ code: status.ALREADY_EXISTS, message: err.message });
  }
  if (err instanceof DriverNotAvailableError) {
    return new RpcException({ code: status.FAILED_PRECONDITION, message: err.message });
  }
  if (err instanceof Error) {
    return new RpcException({ code: status.INTERNAL, message: err.message });
  }
  return new RpcException({ code: status.INTERNAL, message: 'Unknown error' });
}

@Controller()
@DriverServiceControllerMethods()
export class DriverGrpcController implements DriverServiceController {
  constructor(private readonly driverService: IDriverService) {}

  async findNearby(req: FindNearbyRequest): Promise<FindNearbyResponse> {
    try {
      const drivers = await this.driverService.findNearby(
        req.lat,
        req.lng,
        req.radiusKm,
        req.limit,
      );
      return { drivers };
    } catch (err) {
      throw toRpcException(err);
    }
  }

  async assign(req: AssignRequest): Promise<AssignResponse> {
    try {
      return await this.driverService.assign(req.driverId);
    } catch (err) {
      throw toRpcException(err);
    }
  }

  async release(req: ReleaseRequest): Promise<ReleaseResponse> {
    try {
      await this.driverService.release(req.driverId);
      return {};
    } catch (err) {
      throw toRpcException(err);
    }
  }
}
