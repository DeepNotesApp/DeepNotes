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

    encryptedUserName: z.instanceof(Uint8Array),
    encryptedUserNameForUser: z.instanceof(Uint8Array),
  }),
);
export const sendProcedureStep1 = baseProcedureStep1.mutation(sendStep1);

const baseProcedureStep2 = authProcedure.input(notificationsRequestSchema);
export const sendProcedureStep2 = baseProcedureStep2.mutation(sendStep2);

export function registerGroupsJoinRequestsSend(
  fastify: ReturnType<typeof Fastify>,
) {
  createWebsocketEndpoint<InferProcedureInput<typeof baseProcedureStep1>>({
    fastify,
    url: '/trpc/groups.joinRequests.send',

    async lockCommunication({ ctx, input, performCommunication }) {
      await ctx.usingLocks(
        [[`user-lock:${ctx.userId}`], [`group-lock:${input.groupId}`]],
        performCommunication,
      );
    },

    procedures: [
      [sendProcedureStep1, sendStep1],
      [sendProcedureStep2, sendStep2],
    ],
  });
}

export async function sendStep1({
  ctx,
  input,
}: InferProcedureOpts<
  typeof baseProcedureStep1
>): Promise<NotificationsResponse> {
  return await ctx.dataAbstraction.transaction(async (dtrx) => {
    // Assert that user is subscribed

    await ctx.assertUserSubscribed({ userId: ctx.userId });

    const [
      groupAreJoinRequestsAllowed,
      groupJoinRequestRejected,
      groupMemberRole,
    ] = await Promise.all([
      ctx.dataAbstraction.hget(
        'group',
        input.groupId,
        'are-join-requests-allowed',
      ),

      ctx.dataAbstraction.hget(
        'group-join-request',
        `${input.groupId}:${ctx.userId}`,
        'rejected',
      ),

      ctx.dataAbstraction.hget(
        'group-member',
        `${input.groupId}:${ctx.userId}`,
        'role',
      ),
    ]);

    // Check if group allows join requests

    if (!groupAreJoinRequestsAllowed) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'This group does not allow join requests.',
      });
    }

    // Check if user has been rejected from the group

    if (groupJoinRequestRejected) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Your join request has been rejected.',
      });
    }

    // Check if user is already a member of the group

    if (groupMemberRole != null) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You are already a member of this group.',
      });
    }

    await ctx.dataAbstraction.insert(
      'group-join-request',
      `${input.groupId}:${ctx.userId}`,
      {
        group_id: input.groupId,
        user_id: ctx.userId,

        encrypted_name: input.encryptedUserName,
        encrypted_name_for_user: input.encryptedUserNameForUser,

        rejected: false,
      },
      { dtrx },
    );

    return {
      notificationRecipients: objFromEntries(
        (await getGroupManagers(input.groupId)).map(
          ({ userId, publicKeyring }) => [
            userId,
            { publicKeyring: publicKeyring },
          ],
        ),
      ),
    };
  });
}

export async function sendStep2({
  input,
}: InferProcedureOpts<typeof baseProcedureStep2>) {
  await notifyUsers(
    input.notifications.map(({ recipients, encryptedContent }) => ({
      type: 'group-request-sent',

      recipients,
      encryptedContent,
    })),
  );
}
