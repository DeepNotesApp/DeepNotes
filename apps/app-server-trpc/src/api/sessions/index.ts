import { once } from 'lodash';
import { trpc } from 'src/trpc/server';

import { loginProcedure } from './login';
import { logoutProcedure } from './logout';
import { refreshProcedure } from './refresh';

export const sessionsRouter = once(() =>
  trpc.router({
    login: loginProcedure(),
    refresh: refreshProcedure(),
    logout: logoutProcedure(),
  }),
);
