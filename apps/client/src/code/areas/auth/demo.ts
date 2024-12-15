import { wrapSymmetricKey } from '@stdlib/crypto';
import sodium from 'libsodium-wrappers-sumo';

import type { deriveUserValues } from '../../crypto';
import { trpcClient } from '../../trpc';
import { login } from './login';
import { getRegistrationValues } from './register';

export async function enterDemo() {
  const derivedUserValues: Awaited<ReturnType<typeof deriveUserValues>> = {
    loginHash: sodium.randombytes_buf(64),
    masterKey: wrapSymmetricKey(sodium.randombytes_buf(32)),
  };

  const response = await trpcClient.sessions.startDemo.mutate(
    await getRegistrationValues({
      derivedUserValues,
      userName: 'Demo',
    }),
  );

  await login({
    ...response,

    demo: true,
    rememberSession: false,

    masterKey: derivedUserValues.masterKey,
  });
}
