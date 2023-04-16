import { trpc } from 'src/trpc/server';

import { deleteProcedure } from './delete';
import { deletePermanentlyProcedure } from './delete-permanently';
import { restoreProcedure } from './restore';

export const deletionRouter = trpc.router({
  delete: deleteProcedure(),
  restore: restoreProcedure(),
  deletePermanently: deletePermanentlyProcedure(),
});
