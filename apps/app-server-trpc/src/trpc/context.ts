import type { inferAsyncReturnType } from '@trpc/server';
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { dataAbstraction } from 'src/data/data-abstraction';
import { getRedis } from 'src/data/redis';
import { usingLocks } from 'src/data/redlock';

export function createContext({ req, res }: CreateFastifyContextOptions) {
  return {
    req,
    res,

    redis: getRedis(),
    dataAbstraction: dataAbstraction(),

    usingLocks,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
