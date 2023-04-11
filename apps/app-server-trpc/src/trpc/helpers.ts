import { TRPCError } from '@trpc/server';
import { verifyAccessJWT } from 'src/jwt';

import { trpc } from './server';

function createAuthMiddleware({ optional }: { optional: boolean }) {
  return trpc.middleware(async ({ ctx, next }) => {
    const { req, dataAbstraction } = ctx;

    if (req.cookies['loggedIn'] !== 'true') {
      if (optional) {
        return next({ ctx });
      }

      throw new TRPCError({
        message: 'Missing loggedIn cookie.',
        code: 'UNAUTHORIZED',
      });
    }

    // Check if access token exists

    const accessToken = req.cookies['accessToken'];

    if (accessToken == null) {
      if (optional) {
        return next({ ctx });
      }

      throw new TRPCError({
        message: 'Missing access token.',
        code: 'UNAUTHORIZED',
      });
    }

    try {
      // Verify JWT

      const jwtPayload = verifyAccessJWT(accessToken) as
        | {
            uid: string;
            sid: string;
          }
        | undefined;

      if (jwtPayload == null) {
        if (optional) {
          return next({ ctx });
        }

        throw new TRPCError({
          message: 'Invalid access token.',
          code: 'UNAUTHORIZED',
        });
      }

      // Check if session is invalidated

      const invalidated = await dataAbstraction.hget(
        'session',
        jwtPayload.sid,
        'invalidated',
      );

      if (invalidated) {
        if (optional) {
          return next({ ctx });
        }

        throw new TRPCError({
          message: 'Session was invalidated.',
          code: 'UNAUTHORIZED',
        });
      }

      return next({
        ctx: {
          ...ctx,

          userId: jwtPayload.uid,
          sessionId: jwtPayload.sid,
        },
      });
    } catch (error) {
      if (optional) {
        return next({ ctx });
      }

      throw new TRPCError({
        message: 'Invalid access token.',
        code: 'UNAUTHORIZED',
      });
    }
  });
}

const authMiddleware = createAuthMiddleware({ optional: false });
const optionalAuthMiddleware = createAuthMiddleware({ optional: true });

export const publicProcedure = trpc.procedure;
export const authProcedure = trpc.procedure.use(authMiddleware);
export const optionalAuthProcedure = trpc.procedure.use(optionalAuthMiddleware);
