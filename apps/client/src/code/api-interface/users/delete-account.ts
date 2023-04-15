import { bytesToBase64 } from '@stdlib/base64';
import { deriveUserValues } from 'src/code/crypto';

export async function deleteAccount(input: { password: string }) {
  const email = await internals.realtime.hget(
    'user',
    authStore().userId,
    'email',
  );
  const derivedValues = await deriveUserValues(email, input.password);

  await api().post('/api/users/account/general/delete', {
    loginHash: bytesToBase64(derivedValues.loginHash),
  });
}
