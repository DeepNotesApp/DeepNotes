import type { AccessTokenPayload, RefreshTokenPayload } from '@deeplib/misc';

import { signAccessJWT, signLongRefreshJWT, signShortRefreshJWT } from './jwt';

export function generateTokens(input: {
  userId: string;
  sessionId: string;
  refreshCode: string;
  rememberSession: boolean;
}) {
  const accessToken = signAccessJWT({
    uid: input.userId,
    sid: input.sessionId,
  } as AccessTokenPayload);

  let refreshToken: string;

  if (input.rememberSession) {
    refreshToken = signLongRefreshJWT({
      sid: input.sessionId,
      rfc: input.refreshCode,
      rms: input.rememberSession,
    } as RefreshTokenPayload);
  } else {
    refreshToken = signShortRefreshJWT({
      sid: input.sessionId,
      rfc: input.refreshCode,
      rms: input.rememberSession,
    } as RefreshTokenPayload);
  }

  return {
    accessToken,
    refreshToken,
  };
}
