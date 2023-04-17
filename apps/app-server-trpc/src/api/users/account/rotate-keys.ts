import { decryptUserEmail } from '@deeplib/data';
import {
  GroupJoinInvitationModel,
  GroupJoinRequestModel,
  GroupMemberModel,
  UserModel,
} from '@deeplib/db';
import {
  createPrivateKeyring,
  createSymmetricKeyring,
  getPasswordHashValues,
} from '@stdlib/crypto';
import { objFromEntries } from '@stdlib/misc';
import { TRPCError } from '@trpc/server';
import type Fastify from 'fastify';
import { decryptUserRehashedLoginHash, derivePasswordValues } from 'src/crypto';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { invalidateAllSessions } from 'src/utils/sessions';
import { checkCorrectUserPassword } from 'src/utils/users';
import { createWebsocketEndpoint } from 'src/utils/websocket-endpoints';
import { z } from 'zod';

const baseProcedureStep1 = authProcedure.input(
  z.object({
    loginHash: z.instanceof(Uint8Array),
  }),
);
export const rotateKeysProcedureStep1 =
  baseProcedureStep1.mutation(rotateKeysStep1);

const baseProcedureStep2 = authProcedure.input(
  z.object({
    userEncryptedSymmetricKeyring: z.instanceof(Uint8Array),
    userEncryptedPrivateKeyring: z.instanceof(Uint8Array),
    userPublicKeyring: z.instanceof(Uint8Array),

    userEncryptedDefaultNote: z.instanceof(Uint8Array),
    userEncryptedDefaultArrow: z.instanceof(Uint8Array),
    userEncryptedName: z.instanceof(Uint8Array),

    groupJoinRequests: z.record(
      z.object({
        encryptedNameForUser: z.instanceof(Uint8Array),
      }),
    ),
    groupJoinInvitations: z.record(
      z.object({
        encryptedAccessKeyring: z.instanceof(Uint8Array).nullable(),
        encryptedInternalKeyring: z.instanceof(Uint8Array),
      }),
    ),
    groupMembers: z.record(
      z.object({
        encryptedAccessKeyring: z.instanceof(Uint8Array).nullable(),
        encryptedInternalKeyring: z.instanceof(Uint8Array),
      }),
    ),
  }),
);
export const rotateKeysProcedureStep2 =
  baseProcedureStep2.mutation(rotateKeysStep2);

export function registerRotateKeys(fastify: ReturnType<typeof Fastify>) {
  createWebsocketEndpoint({
    fastify,
    url: '/trpc/users.account.rotateKeys',

    async setup({ messageHandler, ctx }) {
      await ctx.usingLocks([[`user-lock:${ctx.userId}`]], async (signals) => {
        messageHandler.redlockSignals.push(...signals);

        await messageHandler.finishPromise;
      });
    },

    procedures: [
      [rotateKeysProcedureStep1, rotateKeysStep1],
      [rotateKeysProcedureStep2, rotateKeysStep2],
    ],
  });
}

export async function rotateKeysStep1({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedureStep1>) {
  (ctx as any).loginHash = input.loginHash;

  // Check if old password is correct

  await checkCorrectUserPassword({
    userId: ctx.userId,
    loginHash: input.loginHash,
  });

  // Get session encryption key

  const [user, groupJoinRequests, groupJoinInvitations, groupMembers] =
    await Promise.all([
      UserModel.query().findById(ctx.userId).select(
        'encrypted_email',

        'encrypted_rehashed_login_hash',

        'encrypted_symmetric_keyring',
        'encrypted_private_keyring',
        'public_keyring',

        'encrypted_default_note',
        'encrypted_default_arrow',

        'encrypted_name',
      ),

      GroupJoinRequestModel.query().where('user_id', ctx.userId).select(
        'group_id',

        'encrypted_name_for_user',
      ),

      GroupJoinInvitationModel.query().where('user_id', ctx.userId).select(
        'group_id',

        'encrypted_access_keyring',
        'encrypted_internal_keyring',
      ),

      GroupMemberModel.query().where('user_id', ctx.userId).select(
        'group_id',

        'encrypted_access_keyring',
        'encrypted_internal_keyring',
      ),
    ]);

  if (user == null) {
    throw new TRPCError({
      message: 'User not found.',
      code: 'NOT_FOUND',
    });
  }

  const passwordHashValues = getPasswordHashValues(
    decryptUserRehashedLoginHash(user.encrypted_rehashed_login_hash),
  );

  const passwordValues = derivePasswordValues(
    input.loginHash,
    passwordHashValues.saltBytes,
  );

  return {
    userEmail: decryptUserEmail(user.encrypted_email),

    userEncryptedSymmetricKeyring: createSymmetricKeyring(
      user.encrypted_symmetric_keyring,
    ).unwrapSymmetric(passwordValues.key, {
      associatedData: {
        context: 'UserEncryptedSymmetricKeyring',
        userId: ctx.userId,
      },
    }).wrappedValue,
    userEncryptedPrivateKeyring: createPrivateKeyring(
      user.encrypted_private_keyring,
    ).unwrapSymmetric(passwordValues.key, {
      associatedData: {
        context: 'UserEncryptedPrivateKeyring',
        userId: ctx.userId,
      },
    }).wrappedValue,
    userPublicKeyring: user.public_keyring,

    userEncryptedDefaultNote: user.encrypted_default_note,
    userEncryptedDefaultArrow: user.encrypted_default_arrow,
    userEncryptedName: user.encrypted_name,

    groupJoinRequests: objFromEntries(
      groupJoinRequests.map((groupJoinRequest) => [
        groupJoinRequest.group_id,
        {
          encryptedNameForUser: groupJoinRequest.encrypted_name_for_user,
        },
      ]),
    ),
    groupJoinInvitations: objFromEntries(
      groupJoinInvitations.map((groupJoinInvitation) => [
        groupJoinInvitation.group_id,
        {
          encryptedAccessKeyring: groupJoinInvitation.encrypted_access_keyring,
          encryptedInternalKeyring:
            groupJoinInvitation.encrypted_internal_keyring,
        },
      ]),
    ),
    groupMembers: objFromEntries(
      groupMembers.map((groupMember) => [
        groupMember.group_id,
        {
          encryptedAccessKeyring: groupMember.encrypted_access_keyring,
          encryptedInternalKeyring: groupMember.encrypted_internal_keyring,
        },
      ]),
    ),
  };
}

export async function rotateKeysStep2({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedureStep2>) {
  return await ctx.dataAbstraction.transaction(async (dtrx) => {
    const user = await UserModel.query()
      .findById(ctx.userId)
      .select('encrypted_rehashed_login_hash');

    if (user == null) {
      throw new TRPCError({
        message: 'User not found.',
        code: 'NOT_FOUND',
      });
    }

    const passwordHashValues = getPasswordHashValues(
      decryptUserRehashedLoginHash(user.encrypted_rehashed_login_hash),
    );

    const passwordValues = derivePasswordValues(
      (ctx as any).loginHash,
      passwordHashValues.saltBytes,
    );

    await Promise.all([
      await ctx.dataAbstraction.patch(
        'user',
        ctx.userId,
        {
          encrypted_symmetric_keyring: createSymmetricKeyring(
            input.userEncryptedSymmetricKeyring,
          ).wrapSymmetric(passwordValues.key, {
            associatedData: {
              context: 'UserEncryptedSymmetricKeyring',
              userId: ctx.userId,
            },
          }).wrappedValue,
          encrypted_private_keyring: createSymmetricKeyring(
            input.userEncryptedPrivateKeyring,
          ).wrapSymmetric(passwordValues.key, {
            associatedData: {
              context: 'UserEncryptedPrivateKeyring',
              userId: ctx.userId,
            },
          }).wrappedValue,
          public_keyring: input.userPublicKeyring,

          encrypted_default_note: input.userEncryptedDefaultNote,
          encrypted_default_arrow: input.userEncryptedDefaultArrow,
          encrypted_name: input.userEncryptedName,
        },
        { dtrx },
      ),

      ...Object.entries(input.groupJoinRequests).map(
        async ([groupId, groupJoinRequest]) => {
          await ctx.dataAbstraction.patch(
            'group-join-request',
            `${groupId}:${ctx.userId}`,
            { encrypted_name_for_user: groupJoinRequest.encryptedNameForUser },
            { dtrx },
          );
        },
      ),
      ...Object.entries(input.groupJoinInvitations).map(
        async ([groupId, groupJoinInvitation]) => {
          await ctx.dataAbstraction.patch(
            'group-join-invitation',
            `${groupId}:${ctx.userId}`,
            {
              encrypted_access_keyring:
                groupJoinInvitation.encryptedAccessKeyring,
              encrypted_internal_keyring:
                groupJoinInvitation.encryptedInternalKeyring,
            },
            { dtrx },
          );
        },
      ),
      ...Object.entries(input.groupMembers).map(
        async ([groupId, groupMember]) => {
          await ctx.dataAbstraction.patch(
            'group-member',
            `${groupId}:${ctx.userId}`,
            {
              encrypted_access_keyring: groupMember.encryptedAccessKeyring,
              encrypted_internal_keyring: groupMember.encryptedInternalKeyring,
            },
            { dtrx },
          );
        },
      ),
    ]);

    await invalidateAllSessions(ctx.userId);
  });
}
