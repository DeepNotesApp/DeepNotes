import type { inferAsyncReturnType } from '@trpc/server';
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { dataAbstraction } from 'src/data/data-abstraction';
import { getRedis } from 'src/data/redis';

export function createContext({ req, res }: CreateFastifyContextOptions) {
  return {
    req,
    res,

    redis: getRedis(),
    dataAbstraction: dataAbstraction(),
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
