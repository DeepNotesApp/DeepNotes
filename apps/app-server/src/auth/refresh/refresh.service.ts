import { SessionModel } from '@deeplib/db';
import type { RefreshTokenPayload } from '@deeplib/misc';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { bytesToBase64 } from '@stdlib/base64';
import { addDays } from '@stdlib/misc';
import sodium from 'libsodium-wrappers';
import { nanoid } from 'nanoid';
import { setCookies } from 'src/cookies';
import { dataAbstraction } from 'src/data/data-abstraction';
import { generateTokens } from 'src/tokens';

import type { EndpointValues } from './refresh.controller';

@Injectable()
export class RefreshService {
  constructor(readonly jwtService: JwtService) {}

  async verifyJwt(values: EndpointValues) {
    try {
      const jwtPayload = values.jwtService.verify<RefreshTokenPayload>(
        values.refreshToken!,
        { secret: process.env.REFRESH_SECRET },
      );

      values.sessionId = jwtPayload.sid;
      values.refreshCode = jwtPayload.rfc;
      values.rememberSession = jwtPayload.rms;

      return true;
    } catch (error) {
      try {
        values.sessionId =
          (values.jwtService.decode(values.refreshToken!) as any)?.sid ?? '';
      } catch (error) {}

      return false;
    }
  }

  async invalidateSession({ sessionId }: EndpointValues) {
    await dataAbstraction().patch('session', sessionId, { invalidated: true });
  }

  async getSession({ refreshCode }: EndpointValues) {
    return await SessionModel.query()
      .where('refresh_code', refreshCode)
      .first();
  }

  async wasSessionInvalidated({ session }: EndpointValues) {
    return (
      session == null ||
      session.invalidated ||
      new Date() > session.expiration_date
    );
  }

  async generateValues(values: EndpointValues) {
    values.oldSessionKey = values.session.encryption_key;
    values.newSessionKey = sodium.crypto_aead_xchacha20poly1305_ietf_keygen();

    values.newRefreshCode = nanoid();
  }

  async updateSessionInDb({
    session,
    newSessionKey,
    newRefreshCode,
  }: EndpointValues) {
    await session.$query().patch({
      encryption_key: newSessionKey,
      refresh_code: newRefreshCode,
      last_refresh_date: new Date(),
      expiration_date: addDays(new Date(), 7),
    });
  }

  async updateUserCookies({
    jwtService,
    session,
    newRefreshCode,
    reply,
    rememberSession,
  }: EndpointValues) {
    const tokens = await generateTokens(
      jwtService,
      session.user_id,
      session.id,
      newRefreshCode,
      rememberSession,
    );

    setCookies(reply, tokens.accessToken, tokens.refreshToken, rememberSession);
  }

  async createResponse({ oldSessionKey, newSessionKey }: EndpointValues) {
    return {
      oldSessionKey: bytesToBase64(oldSessionKey),
      newSessionKey: bytesToBase64(newSessionKey),
    };
  }
}
