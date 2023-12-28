import { trpc } from 'src/trpc/server';

import { addFavoritePagesProcedure } from './add-favorite-pages';
import { clearFavoritePagesProcedure } from './clear-favorite-pages';
import { clearRecentPagesProcedure } from './clear-recent-pages';
import { getCurrentPathProcedure } from './get-current-path';
import { getGroupIdsProcedure } from './get-group-ids';
import { getStartingPageIdProcedure } from './get-starting-page-id';
import { notificationsRouter } from './notifications';
import { removeFavoritePagesProcedure } from './remove-favorite-pages';
import { removeRecentPagesProcedure } from './remove-recent-pages';
import { setEncryptedDefaultArrowProcedure } from './set-encrypted-default-arrow';
import { setEncryptedDefaultNoteProcedure } from './set-encrypted-default-note';

export const pagesRouter = trpc.router({
  notifications: notificationsRouter,

  getStartingPageId: getStartingPageIdProcedure(),
  getCurrentPath: getCurrentPathProcedure(),

  removeRecentPages: removeRecentPagesProcedure(),
  clearRecentPages: clearRecentPagesProcedure(),

  addFavoritePages: addFavoritePagesProcedure(),
  removeFavoritePages: removeFavoritePagesProcedure(),
  clearFavoritePages: clearFavoritePagesProcedure(),

  setEncryptedDefaultNote: setEncryptedDefaultNoteProcedure(),
  setEncryptedDefaultArrow: setEncryptedDefaultArrowProcedure(),

  getGroupIds: getGroupIdsProcedure(),
});
