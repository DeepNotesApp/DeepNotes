import { groupsRouter } from './api/groups';
import { pagesRouter } from './api/pages';
import { sessionsRouter } from './api/sessions';
import { usersRouter } from './api/users';
import { trpc } from './server';

export const appRouter = trpc.router({
  users: usersRouter,
  sessions: sessionsRouter,
  groups: groupsRouter,
  pages: pagesRouter,
});

export type AppRouter = typeof appRouter;
