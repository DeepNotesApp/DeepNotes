import { isNanoID } from '@stdlib/misc';
import { TRPCError } from '@trpc/server';
import type Fastify from 'fastify';
import type {
  InferProcedureContext,
  InferProcedureInput,
  InferProcedureOpts,
} from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import {
  getGroupKeyRotationValues,
  groupKeyRotationSchema,
  rotateGroupKeys,
} from 'src/utils/group-key-rotation';
import { createWebsocketEndpoint } from 'src/utils/websocket-endpoints';
import { z } from 'zod';

const baseProcedureStep1 = authProcedure.input(
  z.object({
    groupId: z.string().refine(isNanoID),
  }),
);
export const makePrivateProcedureStep1 =
  baseProcedureStep1.mutation(makePrivateStep1);

const baseProcedureStep2 = authProcedure.input(groupKeyRotationSchema);
export const makePrivateProcedureStep2 =
  baseProcedureStep2.mutation(makePrivateStep2);

interface Context extends InferProcedureContext<typeof baseProcedureStep1> {
  groupId: string;
}

export function registerGroupsMakePrivate(fastify: ReturnType<typeof Fastify>) {
  createWebsocketEndpoint<InferProcedureInput<typeof baseProcedureStep1>>({
    fastify,
    url: '/trpc/groups.privacy.makePrivate',

    async setup({ ctx, input, run }) {
      await ctx.usingLocks([[`group-lock:${input.groupId}`]], run);
    },

    procedures: [
      [makePrivateProcedureStep1, makePrivateStep1],
      [makePrivateProcedureStep2, makePrivateStep2],
    ],
  });
}

export async function makePrivateStep1({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedureStep1>) {
  (ctx as Context).groupId = input.groupId;

  // Check sufficient permissions

  if (
    !(await ctx.userHasPermission(
      ctx.userId,
      input.groupId,
      'editGroupSettings',
    ))
  ) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Insufficient permissions.',
    });
  }

  // Check if group is already private

  if (!(await ctx.dataAbstraction.hget('group', input.groupId, 'is-public'))) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Group is already private.',
    });
  }

  // Return group key rotation values

  return await getGroupKeyRotationValues(input.groupId, ctx.userId);
}

export async function makePrivateStep2({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedureStep2>) {
  return await ctx.dataAbstraction.transaction(async (dtrx) => {
    return await rotateGroupKeys({
      ...input,

      groupId: (ctx as Context).groupId,

      dtrx,
    });
  });
}
