import { hget } from '@deeplib/data';
import { canManageRole } from '@deeplib/misc';
import { isNanoID, objFromEntries } from '@stdlib/misc';
import { TRPCError } from '@trpc/server';
import type Fastify from 'fastify';
import type { InferProcedureInput, InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { getGroupManagers } from 'src/utils/groups';
import type { NotificationsResponse } from 'src/utils/notifications';
import { notifyUsers } from 'src/utils/notifications';
import { notificationsRequestSchema } from 'src/utils/notifications';
import { createWebsocketEndpoint } from 'src/utils/websocket-endpoints';
import { z } from 'zod';

const baseProcedureStep1 = authProcedure.input(
  z.object({
    groupId: z.string().refine(isNanoID),

    patientId: z.string().refine(isNanoID),
  }),
);
export const cancelProcedureStep1 = baseProcedureStep1.mutation(cancelStep1);

const baseProcedureStep2 = authProcedure.input(notificationsRequestSchema);
export const cancelProcedureStep2 = baseProcedureStep2.mutation(cancelStep2);

export function registerGroupsJoinInvitationsCancel(
  fastify: ReturnType<typeof Fastify>,
) {
  createWebsocketEndpoint<InferProcedureInput<typeof baseProcedureStep1>>({
    fastify,
    url: '/trpc/groups.joinInvitations.cancel',

    async lockCommunication({ ctx, input, performCommunication }) {
      await ctx.usingLocks(
        [
          [`user-lock:${ctx.userId}`],
          [`user-lock:${input.patientId}`],
          [`group-lock:${input.groupId}`],
        ],
        performCommunication,
      );
    },

    procedures: [
      [cancelProcedureStep1, cancelStep1],
      [cancelProcedureStep2, cancelStep2],
    ],
  });
}

export async function cancelStep1({
  ctx,
  input,
}: InferProcedureOpts<
  typeof baseProcedureStep1
>): Promise<NotificationsResponse> {
  return await ctx.dataAbstraction.transaction(async (dtrx) => {
    // Assert that user is subscribed

    await ctx.assertUserSubscribed({ userId: ctx.userId });

    // Check sufficient permissions

    const [agentRole, targetRole] = await ctx.dataAbstraction.mhget([
      hget('group-member', `${input.groupId}:${ctx.userId}`, 'role'),
      hget(
        'group-join-invitation',
        `${input.groupId}:${input.patientId}`,
        'role',
      ),
    ]);

    if (!canManageRole(agentRole, targetRole)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions.',
      });
    }

    // Check if has pending invitation

    if (
      !(await ctx.dataAbstraction.hget(
        'group-join-invitation',
        `${input.groupId}:${input.patientId}`,
        'exists',
      ))
    ) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'No pending invitation.',
      });
    }

    // Cancel invitation

    await ctx.dataAbstraction.delete(
      'group-join-invitation',
      `${input.groupId}:${input.patientId}`,
      { dtrx },
    );

    // Return notification recipients

    return {
      notificationRecipients: objFromEntries(
        (await getGroupManagers(input.groupId, [input.patientId])).map(
          ({ userId, publicKeyring }) => [
            userId,
            { publicKeyring: publicKeyring },
          ],
        ),
      ),
    };
  });
}

export async function cancelStep2({
  input,
}: InferProcedureOpts<typeof baseProcedureStep2>) {
  await notifyUsers(
    input.notifications.map(({ recipients, encryptedContent }) => ({
      type: 'group-invitation-canceled',

      recipients,
      encryptedContent,
    })),
  );
}
