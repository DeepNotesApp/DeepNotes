import { SessionModel } from '@deeplib/db';
import {
  createPrivateKeyring,
  createSymmetricKeyring,
  encodePasswordHash,
} from '@stdlib/crypto';
import { mainLogger, Resolvable } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import type Fastify from 'fastify';
import { pack, unpack } from 'msgpackr';
import type { RedlockAbortSignal } from 'redlock';
import { derivePasswordValues, encryptUserRehashedLoginHash } from 'src/crypto';
import { usingLocks } from 'src/data/redlock';
import { createContext } from 'src/trpc/context';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authHelper, authProcedure } from 'src/trpc/helpers';
import { invalidateAllSessions } from 'src/utils/sessions';
import { checkCorrectUserPassword } from 'src/utils/users';
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
  fastify_: ReturnType<typeof Fastify>,
) {
  fastify_.get(
    '/trpc/users.account.changePassword',
    { websocket: true },
    async (connection, req) => {
      let step = 1;

      const readyPromise = new Resolvable();
      const finishPromise = new Resolvable();

      const redlockSignals: RedlockAbortSignal[] = [];

      connection.socket.on('message', async (message: Buffer) => {
        mainLogger.info('changePassword step %d: received message', step);

        await readyPromise;

        if (step === 1) {
          try {
            const input = (
              changePasswordBaseProcedureStep1._def.inputs[0] as any
            ).parse(unpack(message));

            const output = await changePasswordStep1({
              ctx: ctx as any,
              input,
            });

            checkRedlockSignalAborted(redlockSignals);

            connection.socket.send(
              pack({
                success: true,

                output,
              }),
            );
          } catch (error: any) {
            connection.socket.send(
              pack({
                success: false,

                error: String(error?.message ?? error),
              }),
            );

            connection.end();
            finishPromise.reject();
            return;
          }
        } else if (step === 2) {
          try {
            const input = (
              changePasswordBaseProcedureStep2._def.inputs[0] as any
            ).parse(unpack(message));

            const output = await changePasswordStep2({
              ctx: ctx as any,
              input,
            });

            checkRedlockSignalAborted(redlockSignals);

            connection.socket.send(
              pack({
                success: true,

                output,
              }),
            );
          } catch (error: any) {
            connection.socket.send(
              pack({
                success: false,

                error: String(error?.message ?? error),
              }),
            );

            connection.end();
            finishPromise.reject();
            return;
          }

          connection.end();
          finishPromise.resolve();
          return;
        } else {
          connection.end();
          finishPromise.reject();
          return;
        }

        step++;
      });

      const originalCtx = createContext({ req, res: null as any });

      const ctx = await authHelper({ ctx: originalCtx } as any);

      if (!ctx) {
        connection.end();
        return;
      }

      await usingLocks([[`user-lock:${ctx.userId}`]], async (signals) => {
        redlockSignals.push(...signals);

        readyPromise.resolve();

        await finishPromise;
      });
    },
  );
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
