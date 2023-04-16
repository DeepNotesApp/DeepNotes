import { groupsRouter } from 'src/api/groups';
import { pagesRouter } from 'src/api/pages';
import { sessionsRouter } from 'src/api/sessions';
import { usersRouter } from 'src/api/users';

import { trpc } from './server';

export const appRouter = trpc.router({
  users: usersRouter,
  sessions: sessionsRouter,
  groups: groupsRouter,
  pages: pagesRouter,
});

export type AppRouter = typeof appRouter;
