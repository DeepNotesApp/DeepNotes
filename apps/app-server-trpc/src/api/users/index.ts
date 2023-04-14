import { isNanoID } from '@stdlib/misc';
import { once } from 'lodash';
import { authProcedure, publicProcedure } from 'src/trpc/helpers';
import { trpc } from 'src/trpc/server';
import { z } from 'zod';

import { registerProcedure } from './register';

export const usersRouter = once(() =>
  trpc.router({
    register: registerProcedure(),

    verifyEmail: publicProcedure
      .input(
        z.object({
          emailVerificationCode: z.string().refine(isNanoID),
        }),
      )
      .mutation(({}) => {
        //
      }),

    currentPath: authProcedure
      .input(
        z.object({
          initialPageId: z.string().refine(isNanoID),
        }),
      )
      .query(({}) => {
        //
      }),

    loadSettings: authProcedure.query(() => {
      //
    }),
  }),
);
