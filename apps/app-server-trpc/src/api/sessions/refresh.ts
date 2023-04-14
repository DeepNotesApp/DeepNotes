import { SessionModel } from '@deeplib/db';
import type { RefreshTokenPayload } from '@deeplib/misc';
import { addDays } from '@stdlib/misc';
import { TRPCError } from '@trpc/server';
import sodium from 'libsodium-wrappers';
import { once } from 'lodash';
import { nanoid } from 'nanoid';
import { setCookies } from 'src/cookies';
import { decodeRefreshJWT, verifyRefreshJWT } from 'src/jwt';
import { generateTokens } from 'src/tokens';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { publicProcedure } from 'src/trpc/helpers';

export const refreshProcedure = once(() => publicProcedure.mutation(refresh));

export async function refresh({
  ctx,
}: InferProcedureOpts<typeof publicProcedure>) {
  // Check if loggedIn cookie exists

  if (ctx.req.cookies.loggedIn == null) {
    throw new TRPCError({
      message: 'Missing loggedIn cookie.',
      code: 'UNAUTHORIZED',
    });
  }

  // Check if refresh token exists

  if (ctx.req.cookies.refreshToken == null) {
    throw new TRPCError({
      message: 'No refresh token received.',
      code: 'UNAUTHORIZED',
    });
  }

  // Verify JWT

  let jwtPayload = verifyRefreshJWT<RefreshTokenPayload>(
    ctx.req.cookies.refreshToken,
  );

  if (jwtPayload == null) {
    jwtPayload = decodeRefreshJWT<RefreshTokenPayload>(
      ctx.req.cookies.refreshToken,
    );

    if (jwtPayload != null) {
      await ctx.dataAbstraction.patch('session', jwtPayload.sid, {
        invalidated: true,
      });
    }

    throw new TRPCError({
      message: 'Invalid refresh token.',
      code: 'UNAUTHORIZED',
    });
  }

  // Get session data

  const session = await SessionModel.query()
    .where('refresh_code', jwtPayload.rfc)
    .first();

  // Check if session is valid

  if (
    session == null ||
    session.invalidated ||
    new Date() > session.expiration_date
  ) {
    throw new TRPCError({
      message: 'Session was invalidated.',
      code: 'UNAUTHORIZED',
    });
  }

  // Generate new session values

  const oldSessionKey = session.encryption_key;
  const newSessionKey = sodium.crypto_aead_xchacha20poly1305_ietf_keygen();

  const newRefreshCode = nanoid();

  // Update session in database

  await session.$query().patch({
    encryption_key: newSessionKey,
    refresh_code: newRefreshCode,
    last_refresh_date: new Date(),
    expiration_date: addDays(new Date(), 7),
  });

  // Generate tokens

  const tokens = generateTokens({
    userId: session.user_id,
    sessionId: session.id,
    refreshCode: newRefreshCode,
    rememberSession: jwtPayload.rms,
  });

  // Set cookies for client

  setCookies({
    reply: ctx.res,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    rememberSession: jwtPayload.rms,
  });

  return {
    oldSessionKey,
    newSessionKey,
  };
}
