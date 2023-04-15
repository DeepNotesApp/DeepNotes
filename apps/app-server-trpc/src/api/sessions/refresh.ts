import { SessionModel } from '@deeplib/db';
import type { RefreshTokenPayload } from '@deeplib/misc';
import { TRPCError } from '@trpc/server';
import { once } from 'lodash';
import { decodeRefreshJWT, verifyRefreshJWT } from 'src/jwt';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { publicProcedure } from 'src/trpc/helpers';
import { generateSessionValues } from 'src/utils';

const baseProcedure = publicProcedure;

export const refreshProcedure = once(() => baseProcedure.mutation(refresh));

export async function refresh({
  ctx,
}: InferProcedureOpts<typeof baseProcedure>) {
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

  const { sessionKey: newSessionKey } = await generateSessionValues({
    sessionId: session.id,
    userId: session.user_id,
    rememberSession: jwtPayload.rms,
    reply: ctx.res,
  });

  return {
    oldSessionKey: session.encryption_key,
    newSessionKey,
  };
}
