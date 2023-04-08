import { buildServer } from './fastify-server';

export type { AppRouter } from './trpc-router';

void buildServer().then(async (fastify) => {
  await fastify.listen({
    port: parseInt(process.env.APP_SERVER_TRPC_PORT),
  });
});
