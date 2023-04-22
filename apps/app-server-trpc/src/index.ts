import './env';
import './data/knex';

import { mainLogger } from '@stdlib/misc';

import { fastify } from './fastify/server';

void fastify().then(async (fastify) => {
  await fastify.listen({
    port: parseInt(process.env.APP_SERVER_TRPC_PORT),
    host: '0.0.0.0',
  });

  mainLogger.info(
    `app-server-trpc started on port ${process.env.APP_SERVER_TRPC_PORT}`,
  );
});
