import { once } from 'lodash';
import { trpc } from 'src/trpc/server';

import { deleteProcedure } from './delete';
import { deletePermanentlyProcedure } from './delete-permanently';

export const deletionRouter = once(() =>
  trpc.router({
    delete: deleteProcedure(),
    deletePermanently: deletePermanentlyProcedure(),
  }),
);
