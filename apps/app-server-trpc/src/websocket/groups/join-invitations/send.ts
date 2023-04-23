import { canManageRole } from '@deeplib/misc';
import { isNanoID, objFromEntries } from '@stdlib/misc';
import { TRPCError } from '@trpc/server';
import type Fastify from 'fastify';
import type { InferProcedureInput, InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { getGroupManagers, GroupRoleEnum } from 'src/utils/groups';
import type { NotificationsResponse } from 'src/utils/notifications';
import { notifyUsers } from 'src/utils/notifications';
import { notificationsRequestSchema } from 'src/utils/notifications';
import { createWebsocketEndpoint } from 'src/utils/websocket-endpoints';
import { z } from 'zod';

const baseProcedureStep1 = authProcedure.input(
  z.object({
    groupId: z.string().refine(isNanoID),

    patientId: z.string().refine(isNanoID),
    invitationRole: GroupRoleEnum,

    encryptedAccessKeyring: z.instanceof(Uint8Array),
    encryptedInternalKeyring: z.instanceof(Uint8Array),

    userEncryptedName: z.instanceof(Uint8Array),
  }),
);
export const sendProcedureStep1 = baseProcedureStep1.mutation(sendStep1);

const baseProcedureStep2 = authProcedure.input(notificationsRequestSchema);
export const sendProcedureStep2 = baseProcedureStep2.mutation(sendStep2);

export function registerGroupsJoinInvitationsSend(
  fastify: ReturnType<typeof Fastify>,
) {
  createWebsocketEndpoint<InferProcedureInput<typeof baseProcedureStep1>>({
    fastify,
    url: '/trpc/groups.joinInvitations.send',

    async setup({ ctx, input, run }) {
      await ctx.usingLocks([[`group-lock:${input.groupId}`]], run);
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
    // Check if agent has sufficient permissions

    const agentRole = await ctx.dataAbstraction.hget(
      'group-member',
      `${input.groupId}:${ctx.userId}`,
      'role',
    );

    if (!canManageRole(agentRole, input.invitationRole)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
      });
    }

    // Check if target can be invited

    const [groupJoinInvitationExists, groupMemberExists] = await Promise.all([
      ctx.dataAbstraction.hget(
        'group-join-invitation',
        `${input.groupId}:${input.patientId}`,
        'exists',
      ),

      ctx.dataAbstraction.hget(
        'group-member',
        `${input.groupId}:${input.patientId}`,
        'exists',
      ),
    ]);

    if (groupJoinInvitationExists) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invitation already exists',
      });
    }

    if (groupMemberExists) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'User is already a member of the group.',
      });
    }

    // Create invitation

    const groupIsPublic = await ctx.dataAbstraction.hget(
      'group',
      input.groupId,
      'is-public',
    );

    await Promise.all([
      ctx.dataAbstraction.delete(
        'group-join-request',
        `${input.groupId}:${input.patientId}`,
        { dtrx },
      ),

      ctx.dataAbstraction.insert(
        'group-join-invitation',
        `${input.groupId}:${input.patientId}`,
        {
          group_id: input.groupId,
          user_id: input.patientId,

          inviter_id: ctx.userId,

          role: input.invitationRole,

          encrypted_access_keyring: groupIsPublic
            ? null
            : input.encryptedAccessKeyring,

          encrypted_internal_keyring: input.encryptedInternalKeyring,

          encrypted_name: input.userEncryptedName,
        },
        { dtrx },
      ),
    ]);

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

export async function sendStep2({
  input,
}: InferProcedureOpts<typeof baseProcedureStep2>) {
  await notifyUsers(
    input.notifications.map(({ recipients, encryptedContent }) => ({
      type: 'group-invitation-sent',

      recipients,
      encryptedContent,
    })),
  );
}
