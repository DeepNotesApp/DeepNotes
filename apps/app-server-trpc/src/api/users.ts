import { isNanoID } from '@stdlib/misc';
import { once } from 'lodash';
import { z } from 'zod';

import { authProcedure, publicProcedure } from '../trpc/helpers';
import { trpc } from '../trpc/server';
import { registerProcedure } from './users/register';

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
