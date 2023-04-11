import { once } from 'lodash';

import { trpc } from '../trpc/server';

export const groupsRouter = once(() =>
  trpc.router({
    //
  }),
);
