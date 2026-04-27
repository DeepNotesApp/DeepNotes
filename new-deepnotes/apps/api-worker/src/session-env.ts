import type { SessionEnv, StripeBillingEnv } from "@deepnotes/session";

export type WorkerSessionBindings = {
  ACCESS_SECRET?: string;
  REFRESH_SECRET?: string;
  USER_EMAIL_SECRET?: string;
  USER_EMAIL_ENCRYPTION_KEY?: string;
  USER_REHASHED_LOGIN_HASH_ENCRYPTION_KEY?: string;
  USER_AUTHENTICATOR_SECRET_ENCRYPTION_KEY?: string;
  USER_RECOVERY_CODES_ENCRYPTION_KEY?: string;
  /** Base64 symmetric key for `groups.encrypted_rehashed_password_hash` (legacy `GROUP_REHASHED_PASSWORD_HASH_ENCRYPTION_KEY`). */
  GROUP_REHASHED_PASSWORD_HASH_ENCRYPTION_KEY?: string;
  DEV?: string;
  COOKIE_DOMAIN?: string;
  EMAIL_CASE_SENSITIVITY_EXCEPTIONS?: string;
  /** When `"false"`, new registrations are email-verified without sending mail (local/CI). */
  SEND_EMAILS?: string;
  /** Resend.com API key; required when `SEND_EMAILS` is not `false` and email is sent. */
  RESEND_API_KEY?: string;
  /** Optional; default `https://deepnotes.app` for verification links. */
  PUBLIC_APP_URL?: string;
  /** Optional; when set with token, failed-login rate limits use Upstash REST Redis. */
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  /** Stripe (`stripe` package); checkout, portal, customer hooks when set. */
  STRIPE_SECRET_KEY?: string;
  /** Webhook signing secret for `POST /api/webhooks/stripe`. */
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_MONTHLY_PRICE_ID?: string;
  STRIPE_YEARLY_PRICE_ID?: string;
};

export function getStripeBillingEnv(
  env: WorkerSessionBindings | undefined,
): StripeBillingEnv | null {
  if (
    env?.STRIPE_SECRET_KEY == null ||
    env.STRIPE_SECRET_KEY === "" ||
    env.STRIPE_MONTHLY_PRICE_ID == null ||
    env.STRIPE_MONTHLY_PRICE_ID === "" ||
    env.STRIPE_YEARLY_PRICE_ID == null ||
    env.STRIPE_YEARLY_PRICE_ID === ""
  ) {
    return null;
  }
  return {
    STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
    STRIPE_MONTHLY_PRICE_ID: env.STRIPE_MONTHLY_PRICE_ID,
    STRIPE_YEARLY_PRICE_ID: env.STRIPE_YEARLY_PRICE_ID,
  };
}

export function getStripeWebhookSecret(
  env: WorkerSessionBindings | undefined,
): string | null {
  const s = env?.STRIPE_WEBHOOK_SECRET;
  if (s == null || s === "") {
    return null;
  }
  return s;
}

export function getSessionEnv(
  env: WorkerSessionBindings | undefined,
): SessionEnv | null {
  if (env == null) {
    return null;
  }
  const {
    ACCESS_SECRET,
    REFRESH_SECRET,
    USER_EMAIL_SECRET,
    USER_EMAIL_ENCRYPTION_KEY,
    USER_REHASHED_LOGIN_HASH_ENCRYPTION_KEY,
    USER_AUTHENTICATOR_SECRET_ENCRYPTION_KEY,
    USER_RECOVERY_CODES_ENCRYPTION_KEY,
    GROUP_REHASHED_PASSWORD_HASH_ENCRYPTION_KEY,
  } = env;
  if (
    !ACCESS_SECRET ||
    !REFRESH_SECRET ||
    !USER_EMAIL_SECRET ||
    !USER_EMAIL_ENCRYPTION_KEY ||
    !USER_REHASHED_LOGIN_HASH_ENCRYPTION_KEY ||
    !USER_AUTHENTICATOR_SECRET_ENCRYPTION_KEY ||
    !USER_RECOVERY_CODES_ENCRYPTION_KEY ||
    !GROUP_REHASHED_PASSWORD_HASH_ENCRYPTION_KEY
  ) {
    return null;
  }
  return {
    ACCESS_SECRET,
    REFRESH_SECRET,
    USER_EMAIL_SECRET,
    USER_EMAIL_ENCRYPTION_KEY,
    USER_REHASHED_LOGIN_HASH_ENCRYPTION_KEY,
    USER_AUTHENTICATOR_SECRET_ENCRYPTION_KEY,
    USER_RECOVERY_CODES_ENCRYPTION_KEY,
    GROUP_REHASHED_PASSWORD_HASH_ENCRYPTION_KEY,
    DEV: env.DEV,
    COOKIE_DOMAIN: env.COOKIE_DOMAIN,
    EMAIL_CASE_SENSITIVITY_EXCEPTIONS: env.EMAIL_CASE_SENSITIVITY_EXCEPTIONS,
    SEND_EMAILS: env.SEND_EMAILS,
    RESEND_API_KEY: env.RESEND_API_KEY,
    PUBLIC_APP_URL: env.PUBLIC_APP_URL,
  };
}
