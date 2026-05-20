import { All, Controller, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { HttpProxyService } from './http-proxy.service';

@Controller('drivers')
export class DriversController {
  constructor(
    private readonly proxy: HttpProxyService,
    private readonly configService: ConfigService,
  ) {}

  /** ALL /drivers — protected, forwarded to driver-service root */
  @All()
  forwardRoot(@Req() req: Request, @Res() res: Response) {
    const baseUrl = this.configService.get<string>('services.driverServiceUrl')!;
    return this.proxy.forward(req, baseUrl, '/drivers', res);
  }

  /** ALL /drivers/:path+ — protected, forwarded to driver-service with sub-path */
  @All('*path')
  forward(@Req() req: Request, @Res() res: Response) {
    const baseUrl = this.configService.get<string>('services.driverServiceUrl')!;
    // Use req.path directly — NestJS 11 wildcard params use commas for multi-segment paths
    return this.proxy.forward(req, baseUrl, req.path, res);
  }
}
