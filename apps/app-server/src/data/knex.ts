import { base64ToText } from '@stdlib/base64';
import Knex from 'knex';
import { Model } from 'objection';

export const knex = Knex({
  client: 'pg',
  useNullAsDefault: true,
  connection: {
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT ?? ''),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE,
    ssl: process.env.POSTGRES_CA_CERTIFICATE
      ? { ca: base64ToText(process.env.POSTGRES_CA_CERTIFICATE) }
      : undefined,
  },
  pool: {
    min: 0,
    max: 10,
  },
});

Model.knex(knex);
