import { trpc } from 'src/trpc/server';

import { accountRouter } from './account';
import { pagesRouter } from './pages';

export const usersRouter = trpc.router({
  account: accountRouter,
  pages: pagesRouter,
});
