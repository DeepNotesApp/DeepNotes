import { isNanoID, objFromEntries } from '@stdlib/misc';
import { TRPCError } from '@trpc/server';
import type Fastify from 'fastify';
import type { InferProcedureInput, InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { getGroupManagers } from 'src/utils/groups';
import type { NotificationsResponse } from 'src/utils/notifications';
import { notifyUsers } from 'src/utils/notifications';
import { notificationsRequestSchema } from 'src/utils/notifications';
import { assertUserSubscribed } from 'src/utils/users';
import { createWebsocketEndpoint } from 'src/utils/websocket-endpoints';
import { z } from 'zod';

const baseProcedureStep1 = authProcedure.input(
  z.object({
    groupId: z.string().refine(isNanoID),
  }),
);
export const cancelProcedureStep1 = baseProcedureStep1.mutation(cancelStep1);

const baseProcedureStep2 = authProcedure.input(notificationsRequestSchema);
export const cancelProcedureStep2 = baseProcedureStep2.mutation(cancelStep2);

export function registerGroupsJoinRequestsCancel(
  fastify: ReturnType<typeof Fastify>,
) {
  createWebsocketEndpoint<InferProcedureInput<typeof baseProcedureStep1>>({
    fastify,
    url: '/trpc/groups.joinRequests.cancel',

    async setup({ ctx, input, run }) {
      await ctx.usingLocks(
        [[`user-lock:${ctx.userId}`], [`group-lock:${input.groupId}`]],
        run,
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

    await assertUserSubscribed({
      userId: ctx.userId,
      dataAbstraction: ctx.dataAbstraction,
    });

    // Check if user has a pending request

    if (
      (await ctx.dataAbstraction.hget(
        'group-join-request',
        `${input.groupId}:${ctx.userId}`,
        'rejected',
      )) !== false
    ) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No pending join request.',
      });
    }

    // Delete the join request

    await ctx.dataAbstraction.delete(
      'group-join-request',
      `${input.groupId}:${ctx.userId}`,
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

export async function cancelStep2({
  input,
}: InferProcedureOpts<typeof baseProcedureStep2>) {
  await notifyUsers(
    input.notifications.map(({ recipients, encryptedContent }) => ({
      type: 'group-request-canceled',

      recipients,
      encryptedContent,
    })),
  );
}
