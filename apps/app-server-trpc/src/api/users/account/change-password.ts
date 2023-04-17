import { SessionModel } from '@deeplib/db';
import {
  createPrivateKeyring,
  createSymmetricKeyring,
  encodePasswordHash,
} from '@stdlib/crypto';
import type Fastify from 'fastify';
import { derivePasswordValues, encryptUserRehashedLoginHash } from 'src/crypto';
import { usingLocks } from 'src/data/redlock';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { invalidateAllSessions } from 'src/utils/sessions';
import { checkCorrectUserPassword } from 'src/utils/users';
import { createWebsocketEndpoint } from 'src/utils/websocket-endpoints';
import { z } from 'zod';

const changePasswordBaseProcedureStep1 = authProcedure.input(
  z.object({
    oldLoginHash: z.instanceof(Uint8Array),
  }),
);
export const changePasswordProcedureStep1 =
  changePasswordBaseProcedureStep1.mutation(changePasswordStep1);

const changePasswordBaseProcedureStep2 = authProcedure.input(
  z.object({
    newLoginHash: z.instanceof(Uint8Array),

    encryptedPrivateKeyring: z.instanceof(Uint8Array),
    encryptedSymmetricKeyring: z.instanceof(Uint8Array),
  }),
);
export const changePasswordProcedureStep2 =
  changePasswordBaseProcedureStep2.mutation(changePasswordStep2);

export async function registerChangePassword(
  fastify: ReturnType<typeof Fastify>,
) {
  createWebsocketEndpoint({
    fastify,
    url: '/trpc/users.account.changePassword',

    async setup({ messageHandler, readyPromise, ctx }) {
      await usingLocks([[`user-lock:${ctx.userId}`]], async (signals) => {
        messageHandler.redlockSignals.push(...signals);

        readyPromise.resolve();

        await messageHandler.finishPromise;
      });
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
}: InferProcedureOpts<typeof changePasswordBaseProcedureStep1>) {
  // Check if old password is correct

  await checkCorrectUserPassword({
    userId: ctx.userId,
    loginHash: input.oldLoginHash,
  });

  // Get session encryption key

  const userSession = (await SessionModel.query()
    .findById(ctx.sessionId)
    .leftJoin('users', 'users.id', 'sessions.user_id')
    .select('sessions.encryption_key'))! as unknown as Pick<
    SessionModel,
    'encryption_key'
  >;

  return {
    sessionKey: userSession.encryption_key,
  };
}

export async function changePasswordStep2({
  ctx,
  input,
}: InferProcedureOpts<typeof changePasswordBaseProcedureStep2>) {
  return await ctx.dataAbstraction.transaction(async (dtrx) => {
    const passwordValues = derivePasswordValues(input.newLoginHash);

    await ctx.dataAbstraction.patch(
      'user',
      ctx.userId,
      {
        encrypted_rehashed_login_hash: encryptUserRehashedLoginHash(
          encodePasswordHash(passwordValues.hash, passwordValues.salt, 2, 32),
        ),

        encrypted_private_keyring: createPrivateKeyring(
          input.encryptedPrivateKeyring,
        ).wrapSymmetric(passwordValues.key, {
          associatedData: {
            context: 'UserEncryptedPrivateKeyring',
            userId: ctx.userId,
          },
        }).wrappedValue,
        encrypted_symmetric_keyring: createSymmetricKeyring(
          input.encryptedSymmetricKeyring,
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
