import Redis from 'ioredis';


const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
export const redis = new Redis(url);


// Optional: basic health ping
export async function pingRedis(): Promise<string> {
return redis.ping();
}