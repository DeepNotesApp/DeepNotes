import { trpc } from 'src/trpc/server';

import { makePublicProcedure } from './make-public';
import { setJoinRequestsAllowedProcedure } from './set-join-requests-allowed';

export const privacyRouter = trpc.router({
  makePublic: makePublicProcedure(),
  setJoinRequestsAllowed: setJoinRequestsAllowedProcedure(),
});
