import { isNanoID } from '@stdlib/misc';
import type Fastify from 'fastify';
import type { InferProcedureInput, InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { getGroupKeyRotationValues } from 'src/utils/group-key-rotation';
import { rotateGroupKeys } from 'src/utils/group-key-rotation';
import { groupKeyRotationSchema } from 'src/utils/group-key-rotation';
import { createWebsocketEndpoint } from 'src/utils/websocket-endpoints';
import { z } from 'zod';

const baseProcedureStep1 = authProcedure.input(
  z.object({
    groupId: z.string().refine(isNanoID),
  }),
);
export const rotateKeysProcedureStep1 =
  baseProcedureStep1.mutation(rotateKeysStep1);

const baseProcedureStep2 = authProcedure.input(groupKeyRotationSchema);
export const rotateKeysProcedureStep2 =
  baseProcedureStep2.mutation(rotateKeysStep2);

export function registerGroupsRotateKeys(fastify: ReturnType<typeof Fastify>) {
  createWebsocketEndpoint<InferProcedureInput<typeof baseProcedureStep1>>({
    fastify,
    url: '/trpc/groups.rotateKeys',

    async setup({ ctx, input, run }) {
      await ctx.usingLocks([[`group-lock:${input.groupId}`]], run);
    },

    procedures: [
      [rotateKeysProcedureStep1, rotateKeysStep1],
      [rotateKeysProcedureStep2, rotateKeysStep2],
    ],
  });
}

export async function rotateKeysStep1({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedureStep1>) {
  (ctx as any).groupId = input.groupId;

  return await getGroupKeyRotationValues(input.groupId, ctx.userId);
}

export async function rotateKeysStep2({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedureStep2>) {
  return await ctx.dataAbstraction.transaction(async (dtrx) => {
    return await rotateGroupKeys({
      ...input,

      groupId: (ctx as any).groupId,

      dtrx,
    });
  });
}
