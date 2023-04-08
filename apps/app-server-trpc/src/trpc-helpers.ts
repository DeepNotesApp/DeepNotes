import { trpc } from './trpc-server';

export const publicProcedure = trpc.procedure;

const middleware = trpc.middleware(({ ctx, next }) => {
  return next({
    ctx: {},
  });
});

export const protectedProcedure = trpc.procedure.use(middleware);
