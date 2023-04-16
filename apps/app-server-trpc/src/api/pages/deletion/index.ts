import { once } from 'lodash';
import { trpc } from 'src/trpc/server';

import { deleteProcedure } from './delete';

export const deletionRouter = once(() =>
  trpc.router({
    delete: deleteProcedure(),
  }),
);
