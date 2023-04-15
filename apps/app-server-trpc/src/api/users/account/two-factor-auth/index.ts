import { once } from 'lodash';
import { trpc } from 'src/trpc/server';

import { enableRouter } from './enable';

export const twoFactorAuthRouter = once(() =>
  trpc.router({
    enable: enableRouter(),
  }),
);
