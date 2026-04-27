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
  /**
   * When `"false"`, skip outbound verification email and mark the account verified
   * immediately after insert (legacy `SEND_EMAILS=false` / local dev).
   */
  SEND_EMAILS?: string;
  /**
   * When `SEND_EMAILS` is not `"false"`, used to send registration / resend email (Resend HTTP API).
   */
  RESEND_API_KEY?: string;
  /** Origin for the verification link in the email; defaults to `https://deepnotes.app`. */
  PUBLIC_APP_URL?: string;
};

export function isDev(env: Pick<SessionEnv, "DEV">): boolean {
  return env.DEV === "true" || env.DEV === "1";
}
