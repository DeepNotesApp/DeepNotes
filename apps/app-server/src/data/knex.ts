import Knex from 'knex';
import { Model } from 'objection';

export const knex = Knex({
  client: 'pg',
  useNullAsDefault: true,
  connection: {
    connectionString: `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DATABASE}?ssl=true`,
    ssl: {
      rejectUnauthorized: false, // Required for Render's self-signed certificates
    },
  },
  pool: {
    min: 0,
    max: 10,
  },
});

Model.knex(knex);
