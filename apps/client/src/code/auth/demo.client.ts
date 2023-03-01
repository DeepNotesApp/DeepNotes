import { bytesToBase64 } from '@stdlib/base64';
import { wrapSymmetricKey } from '@stdlib/crypto';
import sodium from 'libsodium-wrappers';

import type { deriveUserValues } from '../crypto.client';
import { login } from './login.client';
import { getRegistrationValues } from './register.client';

export async function enterDemo() {
  const derivedKeys: Awaited<ReturnType<typeof deriveUserValues>> = {
    loginHash: sodium.randombytes_buf(64),
    masterKey: wrapSymmetricKey(sodium.randombytes_buf(32)),
  };

  const response = (
    await api().post<{
      twoFactorAuth: boolean;

      publicKeyring: string;
      encryptedPrivateKeyring: string;
      encryptedSymmetricKeyring: string;

      sessionKey: string;

      personalGroupId: string;

      userId: string;
      sessionId: string;
    }>('/auth/login', {
      email: 'demo',
      loginHash: bytesToBase64(derivedKeys.loginHash),
      rememberSession: false,

      demo: await getRegistrationValues(derivedKeys, 'Demo'),
    })
  ).data;

  await login({
    ...response,

    email: 'demo',
    rememberSession: false,

    masterKey: derivedKeys.masterKey,
  });
}
