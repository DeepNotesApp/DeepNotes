import { once } from 'lodash';
import { trpc } from 'src/trpc/server';

import { disableProcedure } from './disable';
import { enableRouter } from './enable';
import { loadProcedure } from './load';

export const twoFactorAuthRouter = once(() =>
  trpc.router({
    enable: enableRouter(),
    load: loadProcedure(),
    disable: disableProcedure(),
  }),
);
