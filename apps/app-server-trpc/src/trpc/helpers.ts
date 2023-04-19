import type { ProcedureBuilder } from '@trpc/server';
import { TRPCError } from '@trpc/server';
import { verifyAccessJWT } from 'src/jwt';

import { trpc } from './server';

export type InferProcedureResolver<TBuilder extends ProcedureBuilder<any>> =
  Parameters<TBuilder['query']>[0];
export type InferProcedureOpts<TBuilder extends ProcedureBuilder<any>> =
  Parameters<InferProcedureResolver<TBuilder>>[0];

export type InferProcedureContext<TBuilder extends ProcedureBuilder<any>> =
  InferProcedureOpts<TBuilder>['ctx'];
export type InferProcedureInput<TBuilder extends ProcedureBuilder<any>> =
  InferProcedureOpts<TBuilder>['input'];
export type InferProcedureOutput<TBuilder extends ProcedureBuilder<any>> =
  Awaited<ReturnType<InferProcedureResolver<TBuilder>>>;

function createAuthHelper(input: { optional: boolean }) {
  return async ({
    ctx,
  }: Parameters<Parameters<typeof trpc.middleware>[0]>[0]) => {
    if (ctx.req.cookies['loggedIn'] !== 'true') {
      if (input.optional) {
        return false;
      }

      throw new TRPCError({
        message: 'Missing loggedIn cookie.',
        code: 'UNAUTHORIZED',
      });
    }

    // Check if access token exists

    const accessToken = ctx.req.cookies['accessToken'];

    if (accessToken == null) {
      if (input.optional) {
        return false;
      }

      throw new TRPCError({
        message: 'Missing access token.',
        code: 'UNAUTHORIZED',
      });
    }

    // Verify JWT

    const jwtPayload = verifyAccessJWT<{
      uid: string;
      sid: string;
    }>(accessToken);

    if (jwtPayload == null) {
      if (input.optional) {
        return false;
      }

      throw new TRPCError({
        message: 'Invalid access token.',
        code: 'UNAUTHORIZED',
      });
    }

    // Check if session is invalidated

    const invalidated = await ctx.dataAbstraction.hget(
      'session',
      jwtPayload.sid,
      'invalidated',
    );

    if (invalidated) {
      if (input.optional) {
        return false;
      }

      throw new TRPCError({
        message: 'Session was invalidated.',
        code: 'UNAUTHORIZED',
      });
    }

    return {
      ...ctx,

      userId: jwtPayload.uid,
      sessionId: jwtPayload.sid,
    };
  };
}

export const authHelper = createAuthHelper({ optional: false });
export const optionalAuthHelper = createAuthHelper({ optional: true });

export const publicProcedure = trpc.procedure;
export const authProcedure = trpc.procedure.use(
  trpc.middleware(async (opts) => {
    const modifiedCtx = await authHelper(opts);

    if (!modifiedCtx) {
      throw new TRPCError({
        message: 'Invalid access token.',
        code: 'UNAUTHORIZED',
      });
    }

    return opts.next({ ctx: modifiedCtx });
  }),
);
export const optionalAuthProcedure = trpc.procedure.use(
  trpc.middleware(async (opts) => {
    const modifiedCtx = await optionalAuthHelper(opts);

    if (modifiedCtx) {
      return opts.next({
        ctx: {
          ...modifiedCtx,

          userId: modifiedCtx.userId as string | undefined,
          sessionId: modifiedCtx.sessionId as string | undefined,
        },
      });
    } else {
      return opts.next(opts);
    }
  }),
);
