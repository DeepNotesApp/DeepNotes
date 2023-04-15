import { once } from 'lodash';
import { trpc } from 'src/trpc/server';

import { changeProcedure } from './change';
import { disableProcedure } from './disable';
import { enableProcedure } from './enable';

export const passwordRouter = once(() =>
  trpc.router({
    enable: enableProcedure(),
    change: changeProcedure(),
    disable: disableProcedure(),
  }),
);
