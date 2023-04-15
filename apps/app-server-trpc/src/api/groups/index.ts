import { once } from 'lodash';
import { trpc } from 'src/trpc/server';

import { getGroupUserIdsProcedure } from './get-group-user-ids';
import { getMainPageIdProcedure } from './get-main-page-id';
import { passwordRouter } from './password';
import { privacyRouter } from './privacy';

export const groupsRouter = once(() =>
  trpc.router({
    getMainPageId: getMainPageIdProcedure(),

    getGroupUserIds: getGroupUserIdsProcedure(),

    password: passwordRouter(),
    privacy: privacyRouter(),
  }),
);
