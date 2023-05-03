import './env';
import './data/knex';

import { mainLogger } from '@stdlib/misc';

import { fastify } from './fastify/server';

void fastify().then(async (fastify) => {
  await fastify.listen({
    port: parseInt(process.env.APP_SERVER_PORT),
    host: '0.0.0.0',
  });

  mainLogger.info(`app-server started on port ${process.env.APP_SERVER_PORT}`);
});
