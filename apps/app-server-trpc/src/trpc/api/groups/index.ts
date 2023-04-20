import { trpc } from 'src/trpc/server';

import { deletionRouter } from './deletion';
import { getGroupUserIdsProcedure } from './get-group-user-ids';
import { getMainPageIdProcedure } from './get-main-page-id';
import { getPagesProcedure } from './get-pages';
import { passwordRouter } from './password';
import { privacyRouter } from './privacy';

export const groupsRouter = trpc.router({
  getMainPageId: getMainPageIdProcedure(),

  getGroupUserIds: getGroupUserIdsProcedure(),

  getPages: getPagesProcedure(),

  password: passwordRouter,
  privacy: privacyRouter,

  deletion: deletionRouter,
});
