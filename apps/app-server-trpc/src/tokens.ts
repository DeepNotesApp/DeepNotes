import type { AccessTokenPayload, RefreshTokenPayload } from '@deeplib/misc';

import { signAccessJWT, signLongRefreshJWT, signShortRefreshJWT } from './jwt';

export function generateTokens({
  userId,
  sessionId,
  refreshCode,
  rememberSession,
}: {
  userId: string;
  sessionId: string;
  refreshCode: string;
  rememberSession: boolean;
}) {
  const accessToken = signAccessJWT({
    uid: userId,
    sid: sessionId,
  } as AccessTokenPayload);

  let refreshToken: string;

  if (rememberSession) {
    refreshToken = signLongRefreshJWT({
      sid: sessionId,
      rfc: refreshCode,
      rms: rememberSession,
    } as RefreshTokenPayload);
  } else {
    refreshToken = signShortRefreshJWT({
      sid: sessionId,
      rfc: refreshCode,
      rms: rememberSession,
    } as RefreshTokenPayload);
  }

  return {
    accessToken,
    refreshToken,
  };
}
