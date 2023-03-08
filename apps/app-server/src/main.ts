import './env';

import FastifyCookie from '@fastify/cookie';
import FastifyHelmet from '@fastify/helmet';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';

import { AppModule } from './app.module';
import { initKnex } from './data/knex';
import { mainLogger } from './logger';

initKnex();

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: 104857600,
      logger: true,
    }),
    {
      rawBody: true,

      cors: {
        origin: (requestOrigin, callback) => {
          mainLogger().sub('CORS').info('Origin: %s', requestOrigin);

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
      },
    },
  );

  await app.register(FastifyHelmet as any);

  await app.register(FastifyCookie as any);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  await app.listen(parseInt(process.env.APP_SERVER_PORT), '0.0.0.0');
}
void bootstrap();
