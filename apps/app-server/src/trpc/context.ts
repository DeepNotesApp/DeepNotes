import { userHasPermission as _userHasPermission } from '@deeplib/data';
import type { IGroupRole } from '@deeplib/misc';
import type { inferAsyncReturnType } from '@trpc/server';
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { dataAbstraction } from 'src/data/data-abstraction';
import { getRedis } from 'src/data/redis';
import { usingLocks } from 'src/data/redlock';
import { stripe } from 'src/stripe';

export function createContext({ req, res }: CreateFastifyContextOptions) {
  return {
    req,
    res,

    redis: getRedis(),
    dataAbstraction: dataAbstraction(),

    usingLocks,

    userHasPermission: (
      userId: string,
      groupId: string,
      permission: keyof IGroupRole['permissions'],
    ) => _userHasPermission(dataAbstraction(), userId, groupId, permission),

    stripe,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
