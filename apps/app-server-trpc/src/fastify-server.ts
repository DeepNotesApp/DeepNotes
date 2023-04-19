import FastifyCookie from '@fastify/cookie';
import FastifyCors from '@fastify/cors';
import FastifyHelmet from '@fastify/helmet';
import FastifyWebsocket from '@fastify/websocket';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import Fastify from 'fastify';
import { once } from 'lodash';

import { createContext } from './trpc/context';
import { appRouter } from './trpc/router';
import { registerGroupsChangeUserRole } from './websocket/groups/change-user-role';
import { registerGroupsJoinRequestsAccept } from './websocket/groups/join-requests/accept';
import { registerGroupsJoinRequestsCancel } from './websocket/groups/join-requests/cancel';
import { registerGroupsJoinRequestsReject } from './websocket/groups/join-requests/reject';
import { registerGroupsJoinRequestsSend } from './websocket/groups/join-requests/send';
import { registerGroupsMakePrivate } from './websocket/groups/privacy/make-private';
import { registerGroupsRemoveUser } from './websocket/groups/remove-user';
import { registerGroupsRotateKeys } from './websocket/groups/rotate-keys';
import { registerPagesMove } from './websocket/pages/move';
import { registerUsersChangePassword } from './websocket/users/account/change-password';
import { registerUsersRotateKeys } from './websocket/users/account/rotate-keys';

export const fastify = once(async () => {
  const fastify = Fastify({
    logger: true,

    trustProxy: true,

    maxParamLength: 5000, // Needs to be quite high for tRPC
  });

  await fastify.register(FastifyHelmet);
  await fastify.register(FastifyCookie);
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

  // Websocket endpoints

  registerUsersChangePassword(fastify);
  registerUsersRotateKeys(fastify);

  registerGroupsChangeUserRole(fastify);
  registerGroupsRemoveUser(fastify);
  registerGroupsRotateKeys(fastify);
  registerGroupsMakePrivate(fastify);

  registerGroupsJoinRequestsSend(fastify);
  registerGroupsJoinRequestsCancel(fastify);
  registerGroupsJoinRequestsReject(fastify);
  registerGroupsJoinRequestsAccept(fastify);

  registerPagesMove(fastify);

  return fastify;
});
