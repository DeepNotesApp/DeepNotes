import { trpc } from 'src/trpc/server';

import { deleteProcedure } from './delete';
import { emailChangeRouter } from './email-change';
import { registerProcedure } from './register';
import { resendVerificationEmailProcedure } from './resend-verification-email';
import { stripeRouter } from './stripe';
import { twoFactorAuthRouter } from './two-factor-auth';
import { verifyEmailProcedure } from './verify-email';

export const accountRouter = trpc.router({
  register: registerProcedure(),
  resendVerificationEmail: resendVerificationEmailProcedure(),
  verifyEmail: verifyEmailProcedure(),

  emailChange: emailChangeRouter,
  twoFactorAuth: twoFactorAuthRouter,

  stripe: stripeRouter,

  delete: deleteProcedure(),
});
