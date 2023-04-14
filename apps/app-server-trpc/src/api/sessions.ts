import { once } from 'lodash';
import { z } from 'zod';

import { authProcedure } from '../trpc/helpers';
import { trpc } from '../trpc/server';
import { loginProcedure } from './sessions/login';
import { refreshProcedure } from './sessions/refresh';

export const sessionsRouter = once(() =>
  trpc.router({
    login: loginProcedure(),

    refresh: refreshProcedure(),

    logout: authProcedure
      .input(
        z.object({
          username: z.string(),
        }),
      )
      .mutation(({}) => {
        //
      }),
  }),
);
