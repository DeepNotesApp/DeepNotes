import FastifyCors from '@fastify/cors';
import FastifyHelmet from '@fastify/helmet';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import Fastify from 'fastify';

import { createContext } from './trpc-context';
import { appRouter } from './trpc-router';

export async function buildServer() {
  const fastify = Fastify({
    logger: true,

    trustProxy: true,

    maxParamLength: 5000, // Needs to be quite high for tRPC
  });

  await fastify.register(FastifyHelmet);

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

  return fastify;
}
