import type { inferAsyncReturnType } from '@trpc/server';
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { dataAbstraction } from 'src/data/data-abstraction';

export function createContext({ req, res }: CreateFastifyContextOptions) {
  return {
    req,
    res,

    dataAbstraction: dataAbstraction(),
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
