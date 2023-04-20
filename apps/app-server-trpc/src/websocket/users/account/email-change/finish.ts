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
} from '@stdlib/crypto';
import { isNanoID } from '@stdlib/misc';
import { TRPCError } from '@trpc/server';
import type Fastify from 'fastify';
import { clearCookies } from 'src/cookies';
import { derivePasswordValues, encryptUserRehashedLoginHash } from 'src/crypto';
import { stripe } from 'src/stripe';
import type { InferProcedureInput, InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { invalidateAllSessions } from 'src/utils/sessions';
import { checkCorrectUserPassword } from 'src/utils/users';
import { createWebsocketEndpoint } from 'src/utils/websocket-endpoints';
import { z } from 'zod';

const baseProcedureStep1 = authProcedure.input(
  z.object({
    oldLoginHash: z.instanceof(Uint8Array),

    emailVerificationCode: z.string().refine(isNanoID),
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
    url: '/trpc/users.account.changeEmail',

    async setup({ messageHandler, ctx }) {
      await ctx.usingLocks([[`user-lock:${ctx.userId}`]], async (signals) => {
        messageHandler.redlockSignals.push(...signals);

        await messageHandler.finishPromise;
      });
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
  // Check if old password is correct

  await checkCorrectUserPassword({
    userId: ctx.userId,
    loginHash: input.oldLoginHash,
  });

  // Get user encrypted private keyring

  const user = await UserModel.query().findById(ctx.userId).select(
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

  return {
    encryptedSymmetricKeyring: user.encrypted_symmetric_keyring,
    encryptedPrivateKeyring: user.encrypted_private_keyring,
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

    const passwordValues = derivePasswordValues(input.newLoginHash);

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

    await stripe.customers.update(user.customer_id!, {
      email: newEmail,
    });

    clearCookies(ctx.res);
  });
}
