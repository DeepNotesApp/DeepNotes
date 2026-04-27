/**
 * Secrets and flags required for session routes (see docs/AUTH_AND_CORS.md).
 */
export type SessionEnv = {
  ACCESS_SECRET: string;
  REFRESH_SECRET: string;
  USER_EMAIL_SECRET: string;
  /** Base64 symmetric key for `encrypted_email` (legacy `USER_EMAIL_ENCRYPTION_KEY`). */
  USER_EMAIL_ENCRYPTION_KEY: string;
  USER_REHASHED_LOGIN_HASH_ENCRYPTION_KEY: string;
  USER_AUTHENTICATOR_SECRET_ENCRYPTION_KEY: string;
  USER_RECOVERY_CODES_ENCRYPTION_KEY: string;
  /** When `"true"`, cookies omit `Secure` (local HTTP). */
  DEV?: string;
  /** Optional `Domain=` attribute (legacy `HOST`). */
  COOKIE_DOMAIN?: string;
  /** Semicolon-separated emails that skip lowercasing (legacy). */
  EMAIL_CASE_SENSITIVITY_EXCEPTIONS?: string;
};

export function isDev(env: Pick<SessionEnv, "DEV">): boolean {
  return env.DEV === "true" || env.DEV === "1";
}
