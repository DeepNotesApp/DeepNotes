export const serviceUnavailableBody = {
  code: "SERVICE_UNAVAILABLE" as const,
  message:
    "Session routes require ACCESS_SECRET, REFRESH_SECRET, USER_EMAIL_SECRET, USER_EMAIL_ENCRYPTION_KEY, USER_REHASHED_LOGIN_HASH_ENCRYPTION_KEY, USER_AUTHENTICATOR_SECRET_ENCRYPTION_KEY, USER_RECOVERY_CODES_ENCRYPTION_KEY, and GROUP_REHASHED_PASSWORD_HASH_ENCRYPTION_KEY (e.g. Wrangler secrets / .dev.vars).",
};

export function appendSetCookies(res: Response, lines: string[]): void {
  for (const line of lines) {
    res.headers.append("Set-Cookie", line);
  }
}
