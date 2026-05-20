import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserModule } from '../user/user.module';
import { IUserRepository } from '../user/domain/interfaces/user.repository';
import { AuthService } from './application/services/auth.service';
import { IAuthService } from './domain/interfaces/auth.service';
import { ITokenSigner } from './domain/interfaces/token-signer';
import { JwtTokenSigner } from './infrastructure/token/jwt-token-signer';
import { AuthController } from './presentation/auth.controller';

@Module({
  imports: [
    UserModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useFactory: (config: ConfigService): any => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '1d'),
        },
      }),
    }),
  ],
  providers: [
    {
      provide: ITokenSigner,
      useFactory: (jwt: JwtService) => new JwtTokenSigner(jwt),
      inject: [JwtService],
    },
    {
      provide: IAuthService,
      useFactory: (users: IUserRepository, tokens: ITokenSigner) =>
        new AuthService(users, tokens),
      inject: [IUserRepository, ITokenSigner],
    },
  ],
  controllers: [AuthController],
})
export class AuthModule {}
