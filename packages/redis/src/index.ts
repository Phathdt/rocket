/**
 * @rocket/redis — ioredis client wrapper plus a NestJS dynamic module
 * (`RedisModule.forRoot()`) that provides the client under REDIS_CLIENT.
 */

export { RedisModule } from './redis.module';
export { REDIS_CLIENT, type RedisModuleOptions } from './redis.constants';
export { Redis } from 'ioredis';
export type { Redis as RedisClient } from 'ioredis';
