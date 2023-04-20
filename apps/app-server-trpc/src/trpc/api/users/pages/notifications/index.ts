import { trpc } from 'src/trpc/server';

import { loadProcedure } from './load';

export const notificationsRouter = trpc.router({
  load: loadProcedure(),
});
