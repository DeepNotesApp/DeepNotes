import FastifyCookie from '@fastify/cookie';
import FastifyCors from '@fastify/cors';
import FastifyHelmet from '@fastify/helmet';
import FastifyWebsocket from '@fastify/websocket';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import Fastify from 'fastify';
import FastifyRawBody from 'fastify-raw-body';
import { once } from 'lodash';
import { createContext } from 'src/trpc/context';
import { appRouter } from 'src/trpc/router';
import { registerGroupsChangeUserRole } from 'src/websocket/groups/change-user-role';
import { registerGroupsJoinInvitationsAccept } from 'src/websocket/groups/join-invitations/accept';
import { registerGroupsJoinInvitationsCancel } from 'src/websocket/groups/join-invitations/cancel';
import { registerGroupsJoinInvitationsReject } from 'src/websocket/groups/join-invitations/reject';
import { registerGroupsJoinInvitationsSend } from 'src/websocket/groups/join-invitations/send';
import { registerGroupsJoinRequestsAccept } from 'src/websocket/groups/join-requests/accept';
import { registerGroupsJoinRequestsCancel } from 'src/websocket/groups/join-requests/cancel';
import { registerGroupsJoinRequestsReject } from 'src/websocket/groups/join-requests/reject';
import { registerGroupsJoinRequestsSend } from 'src/websocket/groups/join-requests/send';
import { registerGroupsMakePrivate } from 'src/websocket/groups/privacy/make-private';
import { registerGroupsRemoveUser } from 'src/websocket/groups/remove-user';
import { registerGroupsRotateKeys } from 'src/websocket/groups/rotate-keys';
import { registerPagesMove } from 'src/websocket/pages/move';
import { registerUsersChangePassword } from 'src/websocket/users/account/change-password';
import { registerUsersChangeEmailFinish } from 'src/websocket/users/account/email-change/finish';
import { registerUsersRotateKeys } from 'src/websocket/users/account/rotate-keys';

import { registerStripeWebhook } from './stripe-webhook';

export const fastify = once(async () => {
  const fastify = Fastify({
    logger: true,

    trustProxy: true,

    maxParamLength: 5000, // Needs to be quite high for tRPC
  });

  await fastify.register(FastifyHelmet);
  await fastify.register(FastifyCookie);
  await fastify.register(FastifyRawBody, {
    global: false,
  });
  await fastify.register(FastifyWebsocket, {
    options: { maxPayload: 500 * 1048576 },
  });

  // CORS

  await fastify.register(FastifyCors, {
    origin: (requestOrigin, callback) => {
      console.log('CORS Origin: %s', requestOrigin);

      if (
        process.env.DEV ||
        requestOrigin === undefined ||
        requestOrigin === process.env.CLIENT_URL ||
        requestOrigin === 'http://localhost'
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed'), false);
      }
    },
    credentials: true,
  });

  // TRPC

  await fastify.register(fastifyTRPCPlugin, {
    prefix: '/trpc',

    trpcOptions: {
      router: appRouter,

      createContext,
    },
  });

  // Fastify endpoints

  registerStripeWebhook(fastify);

  // Websocket endpoints

  registerUsersChangePassword(fastify);
  registerUsersRotateKeys(fastify);
  registerUsersChangeEmailFinish(fastify);

  registerGroupsChangeUserRole(fastify);
  registerGroupsRemoveUser(fastify);
  registerGroupsRotateKeys(fastify);
  registerGroupsMakePrivate(fastify);

  registerGroupsJoinRequestsSend(fastify);
  registerGroupsJoinRequestsCancel(fastify);
  registerGroupsJoinRequestsReject(fastify);
  registerGroupsJoinRequestsAccept(fastify);

  registerGroupsJoinInvitationsSend(fastify);
  registerGroupsJoinInvitationsCancel(fastify);
  registerGroupsJoinInvitationsReject(fastify);
  registerGroupsJoinInvitationsAccept(fastify);

  registerPagesMove(fastify);

  return fastify;
});
