import { once } from 'lodash';
import { trpc } from 'src/trpc/server';

import { deleteProcedure } from './delete';
import { deletePermanentlyProcedure } from './delete-permanently';
import { restoreProcedure } from './restore';

export const deletionRouter = once(() =>
  trpc.router({
    delete: deleteProcedure(),
    restore: restoreProcedure(),
    deletePermanently: deletePermanentlyProcedure(),
  }),
);
