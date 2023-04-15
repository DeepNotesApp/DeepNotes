import { once } from 'lodash';
import { trpc } from 'src/trpc/server';

import { accountRouter } from './account';
import { pagesRouter } from './pages';

export const usersRouter = once(() =>
  trpc.router({
    account: accountRouter(),
    pages: pagesRouter(),
  }),
);
