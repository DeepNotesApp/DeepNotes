import { trpc } from 'src/trpc/server';

import { bumpProcedure } from './bump';
import { createProcedure } from './create';
import { deletionRouter } from './deletion';
import { snapshotsRouter } from './snapshots';

export const pagesRouter = trpc.router({
  create: createProcedure(),
  bump: bumpProcedure(),

  snapshots: snapshotsRouter,

  deletion: deletionRouter,
});
