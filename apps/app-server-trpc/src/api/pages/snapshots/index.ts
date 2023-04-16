import { once } from 'lodash';
import { trpc } from 'src/trpc/server';

import { loadProcedure } from './load';
import { saveProcedure } from './save';

export const snapshotsRouter = once(() =>
  trpc.router({
    save: saveProcedure(),
    load: loadProcedure(),
  }),
);
