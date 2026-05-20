import { DynamicModule, Global, Module } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT, type RedisModuleOptions } from './redis.constants';

/**
 * Global NestJS module exposing a raw ioredis client under the
 * REDIS_CLIENT token. Pub/Sub subscribers should be created at the
 * call site via `client.duplicate()` (a subscribed connection cannot
 * issue normal commands).
 */
@Global()
@Module({})
export class RedisModule {
  static forRoot(options: RedisModuleOptions = {}): DynamicModule {
    const url = options.url ?? process.env.REDIS_URL ?? 'redis://localhost:6379';

    const redisProvider = {
      provide: REDIS_CLIENT,
      useFactory: (): Redis => new Redis(url, { maxRetriesPerRequest: null }),
    };

    return {
      module: RedisModule,
      providers: [redisProvider],
      exports: [redisProvider],
    };
  }
}
