import { once } from 'lodash';
import { trpc } from 'src/trpc/server';

export const groupsRouter = once(() =>
  trpc.router({
    //
  }),
);
