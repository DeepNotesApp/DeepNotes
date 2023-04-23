import { canManageRole } from '@deeplib/misc';
import { isNanoID, objFromEntries } from '@stdlib/misc';
import { TRPCError } from '@trpc/server';
import type Fastify from 'fastify';
import type { InferProcedureInput, InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { getGroupMembers, GroupRoleEnum } from 'src/utils/groups';
import type { NotificationsResponse } from 'src/utils/notifications';
import { notifyUsers } from 'src/utils/notifications';
import { notificationsRequestSchema } from 'src/utils/notifications';
import { createWebsocketEndpoint } from 'src/utils/websocket-endpoints';
import { z } from 'zod';

const baseProcedureStep1 = authProcedure.input(
  z.object({
    groupId: z.string().refine(isNanoID),

    patientId: z.string().refine(isNanoID),
    targetRole: GroupRoleEnum,

    encryptedAccessKeyring: z.instanceof(Uint8Array),
    encryptedInternalKeyring: z.instanceof(Uint8Array),
  }),
);
export const acceptProcedureStep1 = baseProcedureStep1.mutation(acceptStep1);

const baseProcedureStep2 = authProcedure.input(notificationsRequestSchema);
export const acceptProcedureStep2 = baseProcedureStep2.mutation(acceptStep2);

export function registerGroupsJoinRequestsAccept(
  fastify: ReturnType<typeof Fastify>,
) {
  createWebsocketEndpoint<InferProcedureInput<typeof baseProcedureStep1>>({
    fastify,
    url: '/trpc/groups.joinRequests.accept',

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
    // Check sufficient permissions

    const agentRole = await ctx.dataAbstraction.hget(
      'group-member',
      `${input.groupId}:${ctx.userId}`,
      'role',
    );

    if (!canManageRole(agentRole, input.targetRole)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
      });
    }

    // Check if there's a pending request

    if (
      (await ctx.dataAbstraction.hget(
        'group-join-request',
        `${input.groupId}:${input.patientId}`,
        'rejected',
      )) !== false
    ) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No pending request',
      });
    }

    // Accept join request

    const groupIsPublic = await ctx.dataAbstraction.hget(
      'group',
      input.groupId,
      'is-public',
    );

    const encryptedName = await ctx.dataAbstraction.hget(
      'group-join-request',
      `${input.groupId}:${input.patientId}`,
      'encrypted-name',
    );

    await Promise.all([
      ctx.dataAbstraction.delete(
        'group-join-request',
        `${input.groupId}:${input.patientId}`,
        { dtrx },
      ),

      ctx.dataAbstraction.insert(
        'group-member',
        `${input.groupId}:${input.patientId}`,
        {
          group_id: input.groupId,
          user_id: input.patientId,

          role: input.targetRole,

          encrypted_access_keyring: groupIsPublic
            ? null
            : input.encryptedAccessKeyring,

          encrypted_internal_keyring: input.encryptedInternalKeyring,

          encrypted_name: encryptedName,
        },
      ),
    ]);

    // Return notification recipients

    return {
      notificationRecipients: objFromEntries(
        (await getGroupMembers(input.groupId, [input.patientId])).map(
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
