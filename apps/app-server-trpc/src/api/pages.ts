import { once } from 'lodash';

import { trpc } from '../trpc/server';

export const pagesRouter = once(() =>
  trpc.router({
    //
  }),
);
