/**
 * Failed-login rate limiting (legacy `sessions.login` parity).
 * Keys: `email-failed-login-attempts:${email}`, `ip-failed-login-attempts:${ip}`.
 * Threshold 4 failures / 15 minutes; literal email `demo` skips email-side counter.
 */

export type SessionRedisPort = {
  get(key: string): Promise<string | null>;
  ttl(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
};

const TTL_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 4;

export async function checkFailedLoginAttempts(
  redis: SessionRedisPort,
  email: string,
  ip: string,
): Promise<{ excessive: boolean; loginBlockTTLMinutes: number }> {
  const [emailStr, emailTtl, ipStr, ipTtl] = await Promise.all([
    email === "demo"
      ? Promise.resolve("0")
      : redis.get(`email-failed-login-attempts:${email}`),
    email === "demo" ? Promise.resolve(0) : redis.ttl(`email-failed-login-attempts:${email}`),
    redis.get(`ip-failed-login-attempts:${ip}`),
    redis.ttl(`ip-failed-login-attempts:${ip}`),
  ]);

  const numEmail = Number.parseInt(emailStr ?? "0", 10) || 0;
  const numIp = Number.parseInt(ipStr ?? "0", 10) || 0;
  const excessive = Math.max(numEmail, numIp) >= MAX_ATTEMPTS;
  const ttlSeconds = Math.max(
    emailTtl < 0 ? 0 : emailTtl,
    ipTtl < 0 ? 0 : ipTtl,
  );
  const loginBlockTTLMinutes = Math.ceil(ttlSeconds / 60);

  return { excessive, loginBlockTTLMinutes };
}

export async function incrementFailedLoginAttempts(
  redis: SessionRedisPort,
  email: string,
  ip: string,
): Promise<void> {
  await Promise.all([
    (async () => {
      await redis.incr(`email-failed-login-attempts:${email}`);
      await redis.expire(`email-failed-login-attempts:${email}`, TTL_SECONDS);
    })(),
    (async () => {
      await redis.incr(`ip-failed-login-attempts:${ip}`);
      await redis.expire(`ip-failed-login-attempts:${ip}`, TTL_SECONDS);
    })(),
  ]);
}
