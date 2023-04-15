import { once } from 'lodash';
import { trpc } from 'src/trpc/server';

import { disableProcedure } from './disable';
import { enableRouter } from './enable';
import { forgetDevicesProcedure } from './forget-devices';
import { generateRecoveryCodesProcedure } from './generate-recovery-codes';
import { loadProcedure } from './load';

export const twoFactorAuthRouter = once(() =>
  trpc.router({
    enable: enableRouter(),
    load: loadProcedure(),
    generateRecoveryCodes: generateRecoveryCodesProcedure(),
    forgetDevices: forgetDevicesProcedure(),
    disable: disableProcedure(),
  }),
);
