import { once } from 'lodash';
import { trpc } from 'src/trpc/server';

import { getMainPageIdProcedure } from './get-main-page-id';

export const groupsRouter = once(() =>
  trpc.router({
    getMainPageId: getMainPageIdProcedure(),
  }),
);
