import type { JwtService } from '@nestjs/jwt';
import { describe, expect, it, vi } from 'vitest';

import { JwtTokenSigner } from './jwt-token-signer';

describe('JwtTokenSigner', () => {
  it('delegates signing to the underlying JwtService', () => {
    const sign = vi.fn(() => 'tok');
    const jwt = { sign } as unknown as JwtService;
    const signer = new JwtTokenSigner(jwt);

    const payload = { sub: 'user-1', email: 'alice@example.com', role: 'PASSENGER' };
    const token = signer.sign(payload);

    expect(token).toBe('tok');
    expect(sign).toHaveBeenCalledWith(payload);
  });

  it('delegates verification to the underlying JwtService', () => {
    const decoded = { sub: 'user-1', email: 'alice@example.com', role: 'PASSENGER' };
    const verify = vi.fn(() => decoded);
    const jwt = { verify } as unknown as JwtService;
    const signer = new JwtTokenSigner(jwt);

    const result = signer.verify('some-token');

    expect(result).toEqual(decoded);
    expect(verify).toHaveBeenCalledWith('some-token');
  });
});
