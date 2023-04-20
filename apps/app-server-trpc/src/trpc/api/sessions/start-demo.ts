import {
  createPrivateKeyring,
  createSymmetricKeyring,
  wrapSymmetricKey,
} from '@stdlib/crypto';
import sodium from 'libsodium-wrappers';
import { once } from 'lodash';
import { nanoid } from 'nanoid';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { publicProcedure } from 'src/trpc/helpers';
import { generateSessionValues } from 'src/utils/sessions';
import { registerUser, userRegistrationSchema } from 'src/utils/users';

import { getUserDevice } from '../sessions/login';

const baseProcedure = publicProcedure.input(userRegistrationSchema());

export const startDemoProcedure = once(() => baseProcedure.mutation(startDemo));

export async function startDemo({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  const passwordValues = {
    hash: sodium.randombytes_buf(64),
    key: wrapSymmetricKey(sodium.randombytes_buf(32)),
    salt: new Uint8Array(sodium.randombytes_buf(16)),
  };

  const user = await registerUser({
    ...input,

    demo: true,

    ip: ctx.req.ip,
    userAgent: ctx.req.headers['user-agent'] ?? '',

    email: `demo-${nanoid()}`,

    passwordValues,
  });

  const device = await getUserDevice({
    ip: ctx.req.ip,
    userAgent: ctx.req.headers['user-agent'] ?? '',
    userId: user.id,
  });

  const sessionId = nanoid();

  const { sessionKey } = await generateSessionValues({
    sessionId,
    userId: user.id,
    deviceId: device.id,
    rememberSession: false,
    reply: ctx.res,
  });

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
