import { All, Controller, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/public.decorator';
import { HttpProxyService } from './http-proxy.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly proxy: HttpProxyService,
    private readonly configService: ConfigService,
  ) {}

  /** POST /auth/register — public, forwarded to user-service */
  @Public()
  @All('register')
  register(@Req() req: Request, @Res() res: Response) {
    const baseUrl = this.configService.get<string>('services.userServiceUrl')!;
    return this.proxy.forward(req, baseUrl, '/auth/register', res);
  }

  /** POST /auth/login — public, forwarded to user-service */
  @Public()
  @All('login')
  login(@Req() req: Request, @Res() res: Response) {
    const baseUrl = this.configService.get<string>('services.userServiceUrl')!;
    return this.proxy.forward(req, baseUrl, '/auth/login', res);
  }
}
