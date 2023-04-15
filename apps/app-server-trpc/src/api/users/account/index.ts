import { once } from 'lodash';
import { trpc } from 'src/trpc/server';

import { registerProcedure } from './register';
import { twoFactorAuthRouter } from './two-factor-auth';
import { verifyEmailProcedure } from './verify-email';

export const accountRouter = once(() =>
  trpc.router({
    register: registerProcedure(),

    verifyEmail: verifyEmailProcedure(),

    twoFactorAuth: twoFactorAuthRouter(),
  }),
);
