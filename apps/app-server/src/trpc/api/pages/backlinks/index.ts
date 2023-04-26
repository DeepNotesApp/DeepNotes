import { trpc } from 'src/trpc/server';

import { createProcedure } from './create';

export const backlinksRouter = trpc.router({
  create: createProcedure(),
});
