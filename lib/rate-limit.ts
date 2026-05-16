import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const isDev = process.env.NODE_ENV === "development";

const noopLimiter = {
  limit: () => Promise.resolve({ success: true }),
} as unknown as Ratelimit;

let redis: Redis | null = null;
function getRedis() {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

export const writeRateLimiter = isDev
  ? noopLimiter
  : new Ratelimit({ redis: getRedis(), limiter: Ratelimit.slidingWindow(10, "1 h"), prefix: "rl:write" });

export const updateRateLimiter = isDev
  ? noopLimiter
  : new Ratelimit({ redis: getRedis(), limiter: Ratelimit.slidingWindow(30, "1 h"), prefix: "rl:update" });

export const readRateLimiter = isDev
  ? noopLimiter
  : new Ratelimit({ redis: getRedis(), limiter: Ratelimit.slidingWindow(100, "1 h"), prefix: "rl:read" });

export const uploadRateLimiter = isDev
  ? noopLimiter
  : new Ratelimit({ redis: getRedis(), limiter: Ratelimit.slidingWindow(20, "1 h"), prefix: "rl:upload" });

export const anonCreateRateLimiter = isDev
  ? noopLimiter
  : new Ratelimit({ redis: getRedis(), limiter: Ratelimit.slidingWindow(5, "24 h"), prefix: "rl:anon-create" });

export const claimRateLimiter = isDev
  ? noopLimiter
  : new Ratelimit({ redis: getRedis(), limiter: Ratelimit.slidingWindow(5, "24 h"), prefix: "rl:claim" });
