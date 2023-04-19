import FastifyCookie from '@fastify/cookie';
import FastifyCors from '@fastify/cors';
import FastifyHelmet from '@fastify/helmet';
import FastifyWebsocket from '@fastify/websocket';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import Fastify from 'fastify';
import { once } from 'lodash';

import { registerGroupsChangeUserRole } from './api/groups/change-user-role';
import { registerGroupsJoinRequestsCancel } from './api/groups/join-requests/cancel';
import { registerGroupsJoinRequestsSend } from './api/groups/join-requests/send';
import { registerGroupsMakePrivate } from './api/groups/privacy/make-private';
import { registerGroupsRemoveUser } from './api/groups/remove-user';
import { registerGroupsRotateKeys } from './api/groups/rotate-keys';
import { registerPagesMove } from './api/pages/move';
import { registerUsersChangePassword } from './api/users/account/change-password';
import { registerUsersRotateKeys } from './api/users/account/rotate-keys';
import { createContext } from './trpc/context';
import { appRouter } from './trpc/router';

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

  registerPagesMove(fastify);

  return fastify;
});
