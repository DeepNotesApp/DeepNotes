import { once } from 'lodash';
import { trpc } from 'src/trpc/server';

import { getCurrentPathProcedure } from './get-current-path';
import { getNotificationsProcedure } from './get-notifications';
import { getStartingPageIdProcedure } from './get-starting-page-id';
import { removeRecentPageProcedure } from './remove-recent-page';
import { setEncryptedDefaultArrowProcedure } from './set-encrypted-default-arrow';
import { setEncryptedDefaultNoteProcedure } from './set-encrypted-default-note';

export const pagesRouter = once(() =>
  trpc.router({
    getNotifications: getNotificationsProcedure(),

    getStartingPageId: getStartingPageIdProcedure(),
    getCurrentPath: getCurrentPathProcedure(),
    removeRecentPage: removeRecentPageProcedure(),

    setEncryptedDefaultNote: setEncryptedDefaultNoteProcedure(),
    setEncryptedDefaultArrow: setEncryptedDefaultArrowProcedure(),
  }),
);
