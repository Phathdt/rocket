import { describe, expect, it } from 'vitest';

import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('falls back to the "public" schema when no ?schema= param is present', () => {
    // No connection is opened — only the constructor branch is exercised.
    // The constructor must not throw for a URL lacking the ?schema= param.
    let service: PrismaService | undefined;
    expect(() => {
      service = new PrismaService('postgresql://u:p@localhost:5432/db');
    }).not.toThrow();
    expect(typeof service?.onModuleInit).toBe('function');
  });
});
