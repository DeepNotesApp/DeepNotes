import { trpc } from 'src/trpc/server';

import { deletionRouter } from './deletion';
import { getMainPageIdProcedure } from './get-main-page-id';
import { getPagesProcedure } from './get-pages';
import { getUserIdsProcedure } from './get-user-ids';
import { passwordRouter } from './password';
import { privacyRouter } from './privacy';

export const groupsRouter = trpc.router({
  getMainPageId: getMainPageIdProcedure(),

  getUserIds: getUserIdsProcedure(),

  getPages: getPagesProcedure(),

  password: passwordRouter,
  privacy: privacyRouter,

  deletion: deletionRouter,
});
