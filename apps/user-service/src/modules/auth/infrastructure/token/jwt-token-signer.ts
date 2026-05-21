import { JwtService } from '@nestjs/jwt';
import { ITokenSigner } from '../../domain/interfaces/token-signer';

export class JwtTokenSigner extends ITokenSigner {
  constructor(private readonly jwt: JwtService) {
    super();
  }

  sign(payload: Record<string, unknown>): string {
    return this.jwt.sign(payload);
  }

  verify(token: string): Record<string, unknown> {
    return this.jwt.verify<Record<string, unknown>>(token);
  }
}
