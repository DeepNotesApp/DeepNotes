import type { GroupMemberModel } from '@deeplib/db';
import { GroupJoinInvitationModel } from '@deeplib/db';
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

    userEncryptedName: z.instanceof(Uint8Array),
  }),
);
export const acceptProcedureStep1 = baseProcedureStep1.mutation(acceptStep1);

const baseProcedureStep2 = authProcedure.input(notificationsRequestSchema);
export const acceptProcedureStep2 = baseProcedureStep2.mutation(acceptStep2);

export function registerGroupsJoinInvitationsAccept(
  fastify: ReturnType<typeof Fastify>,
) {
  createWebsocketEndpoint<InferProcedureInput<typeof baseProcedureStep1>>({
    fastify,
    url: '/trpc/groups.joinInvitations.accept',

    async setup({ ctx, input, run }) {
      await ctx.usingLocks([[`group-lock:${input.groupId}`]], run);
    },

    procedures: [
      [acceptProcedureStep1, acceptStep1],
      [acceptProcedureStep2, acceptStep2],
    ],
  });
}

export async function acceptStep1({
  ctx,
  input,
}: InferProcedureOpts<
  typeof baseProcedureStep1
>): Promise<NotificationsResponse> {
  return await ctx.dataAbstraction.transaction(async (dtrx) => {
    // Check if there's a pending invitation

    if (
      !(await ctx.dataAbstraction.hget(
        'group-join-invitation',
        `${input.groupId}:${ctx.userId}`,
        'exists',
      ))
    ) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'No pending invitation.',
      });
    }

    // Accept join invitation

    const groupJoinInvitation = await GroupJoinInvitationModel.query().findById(
      [input.groupId, ctx.userId],
    );

    if (groupJoinInvitation == null) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Group join invitation not found.',
      });
    }

    await Promise.all([
      ctx.dataAbstraction.delete(
        'group-join-invitation',
        `${input.groupId}:${ctx.userId}`,
        { dtrx },
      ),

      ctx.dataAbstraction.insert(
        'group-member',
        `${input.groupId}:${ctx.userId}`,
        {
          ...groupJoinInvitation,

          inviter_id: undefined,

          creation_date: undefined,

          encrypted_name: input.userEncryptedName,
        } as unknown as Partial<GroupMemberModel>,
        { dtrx },
      ),
    ]);

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

export async function acceptStep2({
  input,
}: InferProcedureOpts<typeof baseProcedureStep2>) {
  await notifyUsers(
    input.notifications.map(({ recipients, encryptedContent }) => ({
      type: 'group-request-accepted',

      recipients,
      encryptedContent,
    })),
  );
}
