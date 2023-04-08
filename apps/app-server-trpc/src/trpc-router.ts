import { sessionsRouter } from './sessions';
import { trpc } from './trpc-server';
import { usersRouter } from './users';

export const appRouter = trpc.router({
  users: usersRouter,
  sessions: sessionsRouter,
});

export type AppRouter = typeof appRouter;
