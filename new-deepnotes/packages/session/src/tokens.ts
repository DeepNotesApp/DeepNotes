/** Access token TTL (legacy `@deeplib/misc`). */
export const ACCESS_TOKEN_DURATION_MS = 30 * 60 * 1000;
export const REFRESH_TOKEN_SHORT_DURATION_MS = 60 * 60 * 1000;
export const REFRESH_TOKEN_LONG_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export type AccessTokenPayload = {
  uid: string;
  sid: string;
};

export type RefreshTokenPayload = {
  sid: string;
  rfc: string;
  rms: boolean;
};
