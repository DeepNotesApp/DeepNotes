import { trpc } from 'src/trpc/server';

import { finishProcedure } from './finish';
import { requestProcedure } from './request';

export const enableRouter = trpc.router({
  request: requestProcedure(),
  finish: finishProcedure(),
});
