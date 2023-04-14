import { once } from 'lodash';
import { trpc } from 'src/trpc/server';

export const pagesRouter = once(() =>
  trpc.router({
    //
  }),
);
