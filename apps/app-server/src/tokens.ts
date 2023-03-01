import type { AccessTokenPayload, RefreshTokenPayload } from '@deeplib/misc';
import { getRefreshTokenExpiration } from '@deeplib/misc';
import { ACCESS_TOKEN_DURATION } from '@deeplib/misc';
import type { JwtService } from '@nestjs/jwt';

export async function generateTokens(
  jwtService: JwtService,
  userId: string,
  sessionId: string,
  refreshCode: string,
  rememberSession: boolean,
) {
  const accessToken = jwtService.sign(
    { uid: userId, sid: sessionId } as AccessTokenPayload,
    {
      secret: process.env.ACCESS_SECRET,
      expiresIn: ACCESS_TOKEN_DURATION / 1000,
    },
  );

  const refreshToken = jwtService.sign(
    {
      sid: sessionId,
      rfc: refreshCode,
      rms: rememberSession,
    } as RefreshTokenPayload,
    {
      secret: process.env.REFRESH_SECRET,
      expiresIn: getRefreshTokenExpiration(rememberSession) / 1000,
    },
  );

  return {
    accessToken,
    refreshToken,
  };
}
