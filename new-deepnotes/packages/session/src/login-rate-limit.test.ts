import { describe, expect, it } from "vitest";

import {
  checkFailedLoginAttempts,
  incrementFailedLoginAttempts,
  type SessionRedisPort,
} from "./login-rate-limit.js";

function createMemoryRedis(): SessionRedisPort & {
  store: Map<string, { value: string; ttlAt: number }>;
  now: () => number;
} {
  const store = new Map<string, { value: string; ttlAt: number }>();
  const t = 1_700_000_000_000;
  const now = () => t;
  return {
    store,
    now,
    async get(key) {
      const row = store.get(key);
      if (row == null) return null;
      if (row.ttlAt <= now()) {
        store.delete(key);
        return null;
      }
      return row.value;
    },
    async ttl(key) {
      const row = store.get(key);
      if (row == null) return -2;
      if (row.ttlAt <= now()) return -2;
      return Math.max(0, Math.ceil((row.ttlAt - now()) / 1000));
    },
    async incr(key) {
      const row = store.get(key);
      const v = String((Number.parseInt(row?.value ?? "0", 10) || 0) + 1);
      const ttlAt = row?.ttlAt ?? now() + 15 * 60 * 1000;
      store.set(key, { value: v, ttlAt });
      return Number.parseInt(v, 10);
    },
    async expire(key, seconds) {
      const row = store.get(key);
      if (row == null) return;
      row.ttlAt = now() + seconds * 1000;
    },
  };
}

describe("login-rate-limit", () => {
  it("blocks after four failed attempts (email counter)", async () => {
    const redis = createMemoryRedis();
    const email = "a@b.co";
    const ip = "1.2.3.4";

    for (let i = 0; i < 3; i++) {
      await incrementFailedLoginAttempts(redis, email, ip);
    }
    let s = await checkFailedLoginAttempts(redis, email, ip);
    expect(s.excessive).toBe(false);

    await incrementFailedLoginAttempts(redis, email, ip);
    s = await checkFailedLoginAttempts(redis, email, ip);
    expect(s.excessive).toBe(true);
  });

  it("ignores email counter for literal demo login email (IP must stay low)", async () => {
    const redis = createMemoryRedis();
    for (let i = 0; i < 10; i++) {
      await incrementFailedLoginAttempts(redis, "demo", `10.0.0.${String(i)}`);
    }
    const s = await checkFailedLoginAttempts(redis, "demo", "10.0.0.99");
    expect(s.excessive).toBe(false);
  });
});
