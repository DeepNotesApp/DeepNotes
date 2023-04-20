import { trpc } from 'src/trpc/server';

import { loadProcedure } from './load';
import { markAsReadProcedure } from './mark-as-read';

export const notificationsRouter = trpc.router({
  load: loadProcedure(),

  markAsRead: markAsReadProcedure(),
});
