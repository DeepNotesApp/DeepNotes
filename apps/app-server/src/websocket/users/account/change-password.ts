import { UserModel } from '@deeplib/db';
import {
  createPrivateKeyring,
  createSymmetricKeyring,
  encodePasswordHash,
  getPasswordHashValues,
} from '@stdlib/crypto';
import { TRPCError } from '@trpc/server';
import type Fastify from 'fastify';
import type { InferProcedureInput, InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import {
  decryptUserRehashedLoginHash,
  derivePasswordValues,
  encryptUserRehashedLoginHash,
} from 'src/utils/crypto';
import { invalidateAllSessions } from 'src/utils/sessions';
import { createWebsocketEndpoint } from 'src/utils/websocket-endpoints';
import { z } from 'zod';

const baseProcedureStep1 = authProcedure.input(
  z.object({
    oldLoginHash: z.instanceof(Uint8Array),
  }),
);
export const changePasswordProcedureStep1 =
  baseProcedureStep1.mutation(changePasswordStep1);

const baseProcedureStep2 = authProcedure.input(
  z.object({
    newLoginHash: z.instanceof(Uint8Array),

    newEncryptedPrivateKeyring: z.instanceof(Uint8Array),
    newEncryptedSymmetricKeyring: z.instanceof(Uint8Array),
  }),
);
export const changePasswordProcedureStep2 =
  baseProcedureStep2.mutation(changePasswordStep2);

export function registerUsersChangePassword(
  fastify: ReturnType<typeof Fastify>,
) {
  createWebsocketEndpoint<InferProcedureInput<typeof baseProcedureStep1>>({
    fastify,
    url: '/trpc/users.account.changePassword',

    async setup({ ctx, run }) {
      await ctx.usingLocks([[`user-lock:${ctx.userId}`]], run);
    },

    procedures: [
      [changePasswordProcedureStep1, changePasswordStep1],
      [changePasswordProcedureStep2, changePasswordStep2],
    ],
  });
}

export async function changePasswordStep1({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedureStep1>) {
  // Assert correct old password

  await ctx.assertCorrectUserPassword({
    userId: ctx.userId,
    loginHash: input.oldLoginHash,
  });

  // Assert non-demo account

  await ctx.assertNonDemoAccount({ userId: ctx.userId });

  // Get user data

  const user = await UserModel.query().findById(ctx.userId).select(
    'encrypted_rehashed_login_hash',

    'encrypted_symmetric_keyring',
    'encrypted_private_keyring',
  );

  if (user == null) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'User not found.',
    });
  }

  // Get password values

  const passwordHashValues = getPasswordHashValues(
    decryptUserRehashedLoginHash(user.encrypted_rehashed_login_hash),
  );

  const passwordValues = derivePasswordValues({
    password: input.oldLoginHash,
    salt: passwordHashValues.saltBytes,
  });

  // Return old encrypted keyrings

  return {
    encryptedPrivateKeyring: createPrivateKeyring(
      user.encrypted_private_keyring,
    ).unwrapSymmetric(passwordValues.key, {
      associatedData: {
        context: 'UserEncryptedPrivateKeyring',
        userId: ctx.userId,
      },
    }).wrappedValue,
    encryptedSymmetricKeyring: createSymmetricKeyring(
      user.encrypted_symmetric_keyring,
    ).unwrapSymmetric(passwordValues.key, {
      associatedData: {
        context: 'UserEncryptedSymmetricKeyring',
        userId: ctx.userId,
      },
    }).wrappedValue,
  };
}

export async function changePasswordStep2({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedureStep2>) {
  return await ctx.dataAbstraction.transaction(async (dtrx) => {
    const passwordValues = derivePasswordValues({
      password: input.newLoginHash,
    });

    await ctx.dataAbstraction.patch(
      'user',
      ctx.userId,
      {
        encrypted_rehashed_login_hash: encryptUserRehashedLoginHash(
          encodePasswordHash(passwordValues.hash, passwordValues.salt, 2, 32),
        ),

        encrypted_private_keyring: createPrivateKeyring(
          input.newEncryptedPrivateKeyring,
        ).wrapSymmetric(passwordValues.key, {
          associatedData: {
            context: 'UserEncryptedPrivateKeyring',
            userId: ctx.userId,
          },
        }).wrappedValue,
        encrypted_symmetric_keyring: createSymmetricKeyring(
          input.newEncryptedSymmetricKeyring,
        ).wrapSymmetric(passwordValues.key, {
          associatedData: {
            context: 'UserEncryptedSymmetricKeyring',
            userId: ctx.userId,
          },
        }).wrappedValue,
      },
      { dtrx },
    );

    await invalidateAllSessions(ctx.userId, { dtrx });
  });
}
