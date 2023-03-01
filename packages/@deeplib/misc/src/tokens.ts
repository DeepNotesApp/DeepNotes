export interface AccessTokenPayload {
  uid: string;
  sid: string;
}

export interface RefreshTokenPayload {
  sid: string;
  rfc: string;
  rms: boolean;
}

export const ACCESS_TOKEN_DURATION = 30 * 60 * 1000;
export const REFRESH_TOKEN_SHORT_DURATION = 60 * 60 * 1000;
export const REFRESH_TOKEN_LONG_DURATION = 7 * 24 * 60 * 60 * 1000;

export function getRefreshTokenExpiration(rememberSession: boolean) {
  return rememberSession
    ? REFRESH_TOKEN_LONG_DURATION
    : REFRESH_TOKEN_SHORT_DURATION;
}
