import { trpc } from 'src/trpc/server';

import { loginProcedure } from './login';
import { logoutProcedure } from './logout';
import { refreshProcedure } from './refresh';
import { startDemoProcedure } from './start-demo';

export const sessionsRouter = trpc.router({
  startDemo: startDemoProcedure(),
  login: loginProcedure(),
  refresh: refreshProcedure(),
  logout: logoutProcedure(),
});
