import { trpc } from 'src/trpc/server';

import { addFavoritePagesProcedure } from './add-favorite-pages';
import { clearFavoritePagesProcedure } from './clear-favorite-pages';
import { clearRecentPagesProcedure } from './clear-recent-pages';
import { getCurrentPathProcedure } from './get-current-path';
import { getGroupIdsProcedure } from './get-group-ids';
import { getStartingPageIdProcedure } from './get-starting-page-id';
import { notificationsRouter } from './notifications';
import { removeFavoritePageProcedure } from './remove-favorite-page';
import { removeRecentPageProcedure } from './remove-recent-page';
import { setEncryptedDefaultArrowProcedure } from './set-encrypted-default-arrow';
import { setEncryptedDefaultNoteProcedure } from './set-encrypted-default-note';

export const pagesRouter = trpc.router({
  notifications: notificationsRouter,

  getStartingPageId: getStartingPageIdProcedure(),
  getCurrentPath: getCurrentPathProcedure(),

  removeRecentPage: removeRecentPageProcedure(),
  clearRecentPages: clearRecentPagesProcedure(),

  addFavoritePages: addFavoritePagesProcedure(),
  removeFavoritePage: removeFavoritePageProcedure(),
  clearFavoritePages: clearFavoritePagesProcedure(),

  setEncryptedDefaultNote: setEncryptedDefaultNoteProcedure(),
  setEncryptedDefaultArrow: setEncryptedDefaultArrowProcedure(),

  getGroupIds: getGroupIdsProcedure(),
});
