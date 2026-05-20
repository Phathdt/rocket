import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
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
}
