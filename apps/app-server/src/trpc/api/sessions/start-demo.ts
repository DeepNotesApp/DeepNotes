import {
  createPrivateKeyring,
  createSymmetricKeyring,
  wrapSymmetricKey,
} from '@stdlib/crypto';
import sodium from 'libsodium-wrappers-sumo';
import { once } from 'lodash';
import { nanoid } from 'nanoid';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { publicProcedure } from 'src/trpc/helpers';
import { getUserDevice } from 'src/utils/devices';
import { generateSessionValues } from 'src/utils/sessions';
import { registerUser, userRegistrationSchema } from 'src/utils/users';

const baseProcedure = publicProcedure.input(userRegistrationSchema());

export const startDemoProcedure = once(() => baseProcedure.mutation(startDemo));

export async function startDemo({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  // Generate random password values

  const passwordValues = {
    hash: new Uint8Array(sodium.randombytes_buf(64)),
    key: wrapSymmetricKey(sodium.randombytes_buf(32)),
    salt: new Uint8Array(sodium.randombytes_buf(16)),
  };

  // Register the demo account

  const user = await registerUser({
    ...input,

    demo: true,

    ip: ctx.req.ip,
    userAgent: ctx.req.headers['user-agent'] ?? '',

    email: `demo-${nanoid()}`,

    passwordValues,
  });

  // Get the user's device

  const device = await getUserDevice({
    ip: ctx.req.ip,
    userAgent: ctx.req.headers['user-agent'] ?? '',
    userId: user.id,
  });

  // Generate a new session

  const sessionId = nanoid();

  const { sessionKey } = await generateSessionValues({
    sessionId,
    userId: user.id,
    deviceId: device.id,
    rememberSession: false,
    reply: ctx.res,
  });

  // Return session values

  return {
    userId: user.id,
    sessionId,

    sessionKey,

    personalGroupId: user.personal_group_id,

    publicKeyring: user.public_keyring,
    encryptedPrivateKeyring: createPrivateKeyring(
      user.encrypted_private_keyring,
    ).unwrapSymmetric(passwordValues.key, {
      associatedData: {
        context: 'UserEncryptedPrivateKeyring',
        userId: user.id,
      },
    }).wrappedValue,
    encryptedSymmetricKeyring: createSymmetricKeyring(
      user.encrypted_symmetric_keyring,
    ).unwrapSymmetric(passwordValues.key, {
      associatedData: {
        context: 'UserEncryptedSymmetricKeyring',
        userId: user.id,
      },
    }).wrappedValue,
  };
}
