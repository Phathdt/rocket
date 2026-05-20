import { All, Controller, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { HttpProxyService } from './http-proxy.service';

@Controller('trips')
export class TripsController {
  constructor(
    private readonly proxy: HttpProxyService,
    private readonly configService: ConfigService,
  ) {}

  /** ALL /trips — protected, forwarded to trip-service root */
  @All()
  forwardRoot(@Req() req: Request, @Res() res: Response) {
    const baseUrl = this.configService.get<string>('services.tripServiceUrl')!;
    return this.proxy.forward(req, baseUrl, '/trips', res);
  }

  /** ALL /trips/:path+ — protected, forwarded to trip-service with sub-path */
  @All('*path')
  forward(@Req() req: Request, @Res() res: Response) {
    const baseUrl = this.configService.get<string>('services.tripServiceUrl')!;
    // Use req.path directly — NestJS 11 wildcard params use commas for multi-segment paths
    return this.proxy.forward(req, baseUrl, req.path, res);
  }
}
