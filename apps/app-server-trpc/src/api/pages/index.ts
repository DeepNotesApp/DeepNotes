import { once } from 'lodash';
import { trpc } from 'src/trpc/server';

import { bumpProcedure } from './bump';
import { createProcedure } from './create';

export const pagesRouter = once(() =>
  trpc.router({
    create: createProcedure(),
    bump: bumpProcedure(),
  }),
);
