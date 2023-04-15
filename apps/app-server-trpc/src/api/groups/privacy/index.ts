import { once } from 'lodash';
import { trpc } from 'src/trpc/server';

import { makePublicProcedure } from './make-public';

export const privacyRouter = once(() =>
  trpc.router({
    makePublic: makePublicProcedure(),
  }),
);
