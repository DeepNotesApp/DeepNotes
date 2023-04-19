import { hget } from '@deeplib/data';
import { GroupMemberModel } from '@deeplib/db';
import { canManageRole } from '@deeplib/misc';
import { isNanoID, objFromEntries } from '@stdlib/misc';
import { TRPCError } from '@trpc/server';
import type Fastify from 'fastify';
import type { InferProcedureInput, InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { getGroupMembers } from 'src/utils/groups';
import type { NotificationsResponse } from 'src/utils/notifications';
import { notifyUsers } from 'src/utils/notifications';
import { notificationsRequestSchema } from 'src/utils/notifications';
import { checkUserSubscription } from 'src/utils/users';
import { createWebsocketEndpoint } from 'src/utils/websocket-endpoints';
import { z } from 'zod';

const baseProcedureStep1 = authProcedure.input(
  z.object({
    groupId: z.string().refine(isNanoID),

    patientId: z.string().refine(isNanoID),
  }),
);
export const removeUserProcedureStep1 =
  baseProcedureStep1.mutation(removeUserStep1);

const baseProcedureStep2 = authProcedure.input(notificationsRequestSchema);
export const removeUserProcedureStep2 =
  baseProcedureStep2.mutation(removeUserStep2);

export function registerGroupsRemoveUser(fastify: ReturnType<typeof Fastify>) {
  createWebsocketEndpoint<InferProcedureInput<typeof baseProcedureStep1>>({
    fastify,
    url: '/trpc/groups.removeUser',

    async setup({ messageHandler, ctx, input }) {
      await ctx.usingLocks(
        [[`group-lock:${input.groupId}`]],
        async (signals) => {
          messageHandler.redlockSignals.push(...signals);

          await messageHandler.finishPromise;
        },
      );
    },

    procedures: [
      [removeUserProcedureStep1, removeUserStep1],
      [removeUserProcedureStep2, removeUserStep2],
    ],
  });
}

export async function removeUserStep1({
  ctx,
  input,
}: InferProcedureOpts<
  typeof baseProcedureStep1
>): Promise<NotificationsResponse> {
  return await ctx.dataAbstraction.transaction(async (dtrx) => {
    // Check sufficient permissions

    const [agentRole, targetRole] = await ctx.dataAbstraction.mhget([
      hget('group-member', `${input.groupId}:${ctx.userId}`, 'role'),
      hget('group-member', `${input.groupId}:${input.patientId}`, 'role'),
    ]);

    if (
      ctx.userId !== input.patientId &&
      !canManageRole(agentRole, targetRole)
    ) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions.',
      });
    }

    // Check sufficient subscription

    await checkUserSubscription({
      userId: ctx.userId,
      dataAbstraction: ctx.dataAbstraction,
    });

    // Check if is removing all group owners

    const groupOwners = (await GroupMemberModel.query()
      .where('group_members.group_id', input.groupId)
      .where('group_members.role', 'owner')
      .count()
      .first()) as unknown as { count: number };

    if (targetRole === 'owner' && groupOwners.count <= 1) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot remove the all group owners.',
      });
    }

    // Remove group member

    await ctx.dataAbstraction.delete(
      'group-member',
      `${input.groupId}:${input.patientId}`,
      { dtrx },
    );

    // Return notification recipients

    return {
      notificationRecipients: objFromEntries(
        (await getGroupMembers(input.groupId)).map(
          ({ userId, publicKeyring }) => [
            userId,
            { publicKeyring: publicKeyring },
          ],
        ),
      ),
    };
  });
}

export async function removeUserStep2({
  input,
}: InferProcedureOpts<typeof baseProcedureStep2>) {
  await notifyUsers(
    input.notifications.map(({ recipients, encryptedContent }) => ({
      type: 'group-member-removed',

      recipients,
      encryptedContent,
    })),
  );
}
