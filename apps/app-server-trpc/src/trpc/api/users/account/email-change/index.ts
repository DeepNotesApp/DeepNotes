import { trpc } from 'src/trpc/server';

import { requestProcedure } from './request';

export const emailChangeRouter = trpc.router({
  request: requestProcedure(),
});
