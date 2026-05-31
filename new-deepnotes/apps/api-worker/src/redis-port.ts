import { Redis } from "@upstash/redis";

import type { SessionRedisPort } from "@deepnotes/session-core";

import type { WorkerSessionBindings } from "./session-env.js";

export function getSessionRedisPort(
  env: Pick<WorkerSessionBindings, "UPSTASH_REDIS_REST_URL" | "UPSTASH_REDIS_REST_TOKEN">,
): SessionRedisPort | undefined {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (url == null || url === "" || token == null || token === "") {
    return undefined;
  }

  const redis = new Redis({ url, token });
  return {
    async get(key: string) {
      const v = await redis.get(key);
      if (v == null) return null;
      return typeof v === "string" ? v : String(v);
    },
    ttl: (key) => redis.ttl(key),
    incr: (key) => redis.incr(key),
    expire: async (key, seconds) => {
      await redis.expire(key, seconds);
    },
  };
}
