import { All, Controller, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { HttpProxyService } from './http-proxy.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly proxy: HttpProxyService,
    private readonly configService: ConfigService,
  ) {}

  /** ALL /users — protected, forwarded to user-service root */
  @All()
  forwardRoot(@Req() req: Request, @Res() res: Response) {
    const baseUrl = this.configService.get<string>('services.userServiceUrl')!;
    return this.proxy.forward(req, baseUrl, '/users', res);
  }

  /** ALL /users/:path+ — protected, forwarded to user-service with sub-path */
  @All('*path')
  forward(@Req() req: Request, @Res() res: Response) {
    const baseUrl = this.configService.get<string>('services.userServiceUrl')!;
    // Use req.path directly — NestJS 11 wildcard params use commas for multi-segment paths
    return this.proxy.forward(req, baseUrl, req.path, res);
  }
}
