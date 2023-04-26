import { trpc } from 'src/trpc/server';

import { createProcedure } from './create';
import { deleteProcedure } from './delete';

export const backlinksRouter = trpc.router({
  create: createProcedure(),
  delete: deleteProcedure(),
});
