import { trpc } from 'src/trpc/server';

import { registerProcedure } from './register';
import { twoFactorAuthRouter } from './two-factor-auth';
import { verifyEmailProcedure } from './verify-email';

export const accountRouter = trpc.router({
  register: registerProcedure(),

  verifyEmail: verifyEmailProcedure(),

  twoFactorAuth: twoFactorAuthRouter,
});
