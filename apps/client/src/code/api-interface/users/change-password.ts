import { base64ToBytes, bytesToBase64 } from '@stdlib/base64';
import {
  createPrivateKeyring,
  createSymmetricKeyring,
  wrapSymmetricKey,
} from '@stdlib/crypto';
import { deriveUserValues } from 'src/code/crypto';

export async function changePassword(input: {
  oldPassword: string;
  newPassword: string;
}) {
  const email = await internals.realtime.hget(
    'user',
    authStore().userId,
    'email',
  );

  // Compute derived keys

  const oldDerivedValues = await deriveUserValues(email, input.oldPassword);
  const newDerivedValues = await deriveUserValues(email, input.newPassword);

  // Reencrypt derived keys

  const response = (
    await api().post<{
      sessionKey: string;
    }>('/api/users/account/security/change-password', {
      oldLoginHash: bytesToBase64(oldDerivedValues.loginHash),
    })
  ).data;

  const wrappedSessionKey = wrapSymmetricKey(
    base64ToBytes(response.sessionKey),
  );

  // Reencrypt values

  const encryptedPrivateKeyring = bytesToBase64(
    createPrivateKeyring(
      base64ToBytes(internals.storage.getItem('encryptedPrivateKeyring')!),
    )
      .unwrapSymmetric(wrappedSessionKey, {
        associatedData: {
          context: 'SessionUserPrivateKeyring',
          userId: authStore().userId,
        },
      })
      .wrapSymmetric(newDerivedValues.masterKey, {
        associatedData: {
          context: 'UserPrivateKeyring',
          userId: authStore().userId,
        },
      }).wrappedValue,
  );

  const encryptedSymmetricKeyring = bytesToBase64(
    createSymmetricKeyring(
      base64ToBytes(internals.storage.getItem('encryptedSymmetricKeyring')!),
    )
      .unwrapSymmetric(wrappedSessionKey, {
        associatedData: {
          context: 'SessionUserSymmetricKeyring',
          userId: authStore().userId,
        },
      })
      .wrapSymmetric(newDerivedValues.masterKey, {
        associatedData: {
          context: 'UserSymmetricKeyring',
          userId: authStore().userId,
        },
      }).wrappedValue,
  );

  // Request password change

  await api().post('/api/users/account/security/change-password', {
    oldLoginHash: bytesToBase64(oldDerivedValues.loginHash),
    newLoginHash: bytesToBase64(newDerivedValues.loginHash),

    encryptedPrivateKeyring,
    encryptedSymmetricKeyring,
  });
}
