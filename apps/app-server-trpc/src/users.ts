import { z } from 'zod';

import { publicProcedure } from './trpc-helpers';
import { trpc } from './trpc-server';

export const usersRouter = trpc.router({
  login: publicProcedure
    .input(
      z.object({
        username: z.string(),
      }),
    )
    .mutation(({ input }) => {
      //
    }),
});
