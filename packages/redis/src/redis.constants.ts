/** Injection token for the shared ioredis client instance. */
export const REDIS_CLIENT = 'REDIS_CLIENT';

/** Options accepted by RedisModule.forRoot(). */
export interface RedisModuleOptions {
  /** Connection string, e.g. redis://localhost:6379. Defaults to process.env.REDIS_URL. */
  url?: string;
}
