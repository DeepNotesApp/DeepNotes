import { once } from 'lodash';
import { trpc } from 'src/trpc/server';

import { registerProcedure } from './register';
import { removeRecentPageProcedure } from './remove-recent-page';
import { setEncryptedDefaultArrowProcedure } from './set-encrypted-default-arrow';
import { setEncryptedDefaultNoteProcedure } from './set-encrypted-default-note';
import { verifyEmailProcedure } from './verify-email';

export const usersRouter = once(() =>
  trpc.router({
    register: registerProcedure(),

    verifyEmail: verifyEmailProcedure(),

    removeRecentPage: removeRecentPageProcedure(),

    setEncryptedDefaultNote: setEncryptedDefaultNoteProcedure(),
    setEncryptedDefaultArrow: setEncryptedDefaultArrowProcedure(),
  }),
);
