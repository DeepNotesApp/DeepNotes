import './env';
import './data/knex';

import { buildServer } from './fastify-server';
import { mainLogger } from './logger';

export type { RegistrationSchema } from './api/users/register';
export type { AppRouter } from './trpc/router';

void buildServer().then(async (fastify) => {
  await fastify.listen({
    port: parseInt(process.env.APP_SERVER_TRPC_PORT),
    host: '0.0.0.0',
  });

  mainLogger.info(
    `app-server-trpc started on port ${process.env.APP_SERVER_TRPC_PORT}`,
  );
});
