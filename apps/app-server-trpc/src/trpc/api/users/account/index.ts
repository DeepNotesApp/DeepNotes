import { trpc } from 'src/trpc/server';

import { createCheckoutSessionProcedure } from './create-checkout-session';
import { createPortalSessionProcedure } from './create-portal-session';
import { deleteProcedure } from './delete';
import { emailChangeRouter } from './email-change';
import { registerProcedure } from './register';
import { twoFactorAuthRouter } from './two-factor-auth';
import { verifyEmailProcedure } from './verify-email';

export const accountRouter = trpc.router({
  register: registerProcedure(),
  verifyEmail: verifyEmailProcedure(),

  emailChange: emailChangeRouter,
  twoFactorAuth: twoFactorAuthRouter,

  createCheckoutSession: createCheckoutSessionProcedure(),
  createPortalSession: createPortalSessionProcedure(),

  delete: deleteProcedure(),
});
