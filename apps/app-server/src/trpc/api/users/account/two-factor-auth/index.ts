import { trpc } from 'src/trpc/server';

import { disableProcedure } from './disable';
import { enableRouter } from './enable';
import { forgetTrustedDevicesProcedure } from './forget-devices';
import { generateRecoveryCodesProcedure } from './generate-recovery-codes';
import { loadProcedure } from './load';

export const twoFactorAuthRouter = trpc.router({
  enable: enableRouter,
  load: loadProcedure(),
  generateRecoveryCodes: generateRecoveryCodesProcedure(),
  forgetTrustedDevices: forgetTrustedDevicesProcedure(),
  disable: disableProcedure(),
});
