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
  }),
);
export const rejectProcedureStep1 = baseProcedureStep1.mutation(rejectStep1);

const baseProcedureStep2 = authProcedure.input(notificationsRequestSchema);
export const rejectProcedureStep2 = baseProcedureStep2.mutation(rejectStep2);

export function registerGroupsJoinInvitationsReject(
  fastify: ReturnType<typeof Fastify>,
) {
  createWebsocketEndpoint<InferProcedureInput<typeof baseProcedureStep1>>({
    fastify,
    url: '/trpc/groups.joinInvitations.reject',

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
    // Check pending invitation

    if (
      await ctx.dataAbstraction.hget(
        'group-join-invitation',
        `${input.groupId}:${ctx.userId}`,
        'exists',
      )
    ) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No pending join request',
      });
    }

    // Reject join request

    await ctx.dataAbstraction.delete(
      'group-join-invitation',
      `${input.groupId}:${ctx.userId}`,
      { dtrx },
    );

    // Return notification recipients

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

export async function rejectStep2({
  input,
}: InferProcedureOpts<typeof baseProcedureStep2>) {
  await notifyUsers(
    input.notifications.map(({ recipients, encryptedContent }) => ({
      type: 'group-invitation-rejected',

      recipients,
      encryptedContent,
    })),
  );
}
