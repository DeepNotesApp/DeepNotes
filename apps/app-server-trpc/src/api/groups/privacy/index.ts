import { trpc } from 'src/trpc/server';

import { makePublicProcedure } from './make-public';

export const privacyRouter = trpc.router({
  makePublic: makePublicProcedure(),
});
