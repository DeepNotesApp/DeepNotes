import { userHasPermission } from '@deeplib/data';
import type { GroupRolePermission } from '@deeplib/misc';
import type { inferAsyncReturnType } from '@trpc/server';
import { TRPCError } from '@trpc/server';
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

    async assertSufficientGroupPermissions(input: {
      userId: any;
      groupId: any;
      permission: GroupRolePermission;
    }) {
      if (
        !(await userHasPermission(
          dataAbstraction(),
          input.userId,
          input.groupId,
          input.permission,
        ))
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions.',
        });
      }
    },

    stripe,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
