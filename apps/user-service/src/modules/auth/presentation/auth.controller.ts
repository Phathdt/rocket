import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthResponse } from '@rocket/contracts';
import { RegisterDto } from '../domain/dto/register.schema';
import { LoginDto } from '../domain/dto/login.schema';
import { IAuthService } from '../domain/interfaces/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: IAuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  @Get('verify')
  @HttpCode(HttpStatus.OK)
  async verify(
    @Headers('authorization') authorization: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or malformed Authorization header');
    }

    const token = authorization.slice(7);
    const payload = await this.authService.verifyToken(token);

    res.setHeader('x-user-id', payload.sub);
    res.setHeader('x-user-role', payload.role);
  }
}
