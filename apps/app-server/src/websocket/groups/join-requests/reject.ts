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

    patientId: z.string().refine(isNanoID),
  }),
);
export const rejectProcedureStep1 = baseProcedureStep1.mutation(rejectStep1);

const baseProcedureStep2 = authProcedure.input(notificationsRequestSchema);
export const rejectProcedureStep2 = baseProcedureStep2.mutation(rejectStep2);

export function registerGroupsJoinRequestsReject(
  fastify: ReturnType<typeof Fastify>,
) {
  createWebsocketEndpoint<InferProcedureInput<typeof baseProcedureStep1>>({
    fastify,
    url: '/trpc/groups.joinRequests.reject',

    async setup({ ctx, input, run }) {
      await ctx.usingLocks(
        [
          [`user-lock:${ctx.userId}`],
          [`user-lock:${input.patientId}`],
          [`group-lock:${input.groupId}`],
        ],
        run,
      );
    },

    procedures: [
      [rejectProcedureStep1, rejectStep1],
      [rejectProcedureStep2, rejectStep2],
    ],
  });
}

export async function rejectStep1({
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

    // Check sufficient permissions

    await ctx.assertSufficientGroupPermissions({
      userId: ctx.userId,
      groupId: input.groupId,
      permission: 'manageLowerRanks',
    });

    // Check pending request

    if (
      (await ctx.dataAbstraction.hget(
        'group-join-request',
        `${input.groupId}:${input.patientId}`,
        'rejected',
      )) !== false
    ) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No pending join request',
      });
    }

    // Reject join request

    await ctx.dataAbstraction.patch(
      'group-join-request',
      `${input.groupId}:${input.patientId}`,
      { rejected: true },
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

export async function rejectStep2({
  input,
}: InferProcedureOpts<typeof baseProcedureStep2>) {
  await notifyUsers(
    input.notifications.map(({ recipients, encryptedContent }) => ({
      type: 'group-request-rejected',

      recipients,
      encryptedContent,
    })),
  );
}
