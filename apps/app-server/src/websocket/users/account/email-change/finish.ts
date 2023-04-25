import {
  decryptUserEmail,
  encryptUserEmail,
  hashUserEmail,
} from '@deeplib/data';
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
import {
  assertCorrectUserPassword,
  assertNonDemoAccount,
} from 'src/utils/users';
import { createWebsocketEndpoint } from 'src/utils/websocket-endpoints';
import { z } from 'zod';

const baseProcedureStep1 = authProcedure.input(
  z.object({
    oldLoginHash: z.instanceof(Uint8Array),

    emailVerificationCode: z.string().regex(/^\d{6}$/),
  }),
);
export const finishProcedureStep1 =
  baseProcedureStep1.mutation(changeEmailStep1);

const baseProcedureStep2 = authProcedure.input(
  z.object({
    newLoginHash: z.instanceof(Uint8Array),

    newEncryptedPrivateKeyring: z.instanceof(Uint8Array),
    newEncryptedSymmetricKeyring: z.instanceof(Uint8Array),
  }),
);
export const finishProcedureStep2 =
  baseProcedureStep2.mutation(changeEmailStep2);

export function registerUsersChangeEmailFinish(
  fastify: ReturnType<typeof Fastify>,
) {
  createWebsocketEndpoint<InferProcedureInput<typeof baseProcedureStep1>>({
    fastify,
    url: '/trpc/users.account.emailChange.finish',

    async setup({ ctx, run }) {
      await ctx.usingLocks([[`user-lock:${ctx.userId}`]], run);
    },

    procedures: [
      [finishProcedureStep1, changeEmailStep1],
      [finishProcedureStep2, changeEmailStep2],
    ],
  });
}

export async function changeEmailStep1({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedureStep1>) {
  // Assert correct old password

  await assertCorrectUserPassword({
    userId: ctx.userId,
    loginHash: input.oldLoginHash,
  });

  // Assert non-demo account

  await assertNonDemoAccount({
    userId: ctx.userId,
    dataAbstraction: ctx.dataAbstraction,
  });

  // Get user data

  const user = await UserModel.query().findById(ctx.userId).select(
    'encrypted_rehashed_login_hash',

    'email_verification_code',

    'encrypted_symmetric_keyring',
    'encrypted_private_keyring',
  );

  if (user?.email_verification_code !== input.emailVerificationCode) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid email verification code.',
    });
  }

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

export async function changeEmailStep2({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedureStep2>) {
  return await ctx.dataAbstraction.transaction(async (dtrx) => {
    const user = await UserModel.query()
      .findById(ctx.userId)
      .select('encrypted_new_email', 'customer_id');

    if (user == null) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'User not found.',
      });
    }

    if (user.encrypted_new_email == null) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No email change requested.',
      });
    }

    const newEmail = decryptUserEmail(user.encrypted_new_email);

    const passwordValues = derivePasswordValues({
      password: input.newLoginHash,
    });

    await Promise.all([
      ctx.dataAbstraction.patch(
        'user',
        ctx.userId,
        {
          encrypted_email: encryptUserEmail(newEmail),
          email_hash: hashUserEmail(newEmail),

          encrypted_new_email: null,
          email_verification_code: null,

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
      ),

      invalidateAllSessions(ctx.userId, { dtrx }),
    ]);

    await ctx.stripe.customers.update(user.customer_id!, {
      email: newEmail,
    });
  });
}
