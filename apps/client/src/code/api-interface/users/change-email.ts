import { base64ToBytes, bytesToBase64 } from '@stdlib/base64';
import {
  createPrivateKeyring,
  createSymmetricKeyring,
  wrapSymmetricKey,
} from '@stdlib/crypto';
import { deriveUserValues } from 'src/code/crypto';

export async function requestEmailChange(input: {
  newEmail: string;
  oldDerivedUserValues: Awaited<ReturnType<typeof deriveUserValues>>;
}) {
  await api().post('/api/users/account/general/change-email', {
    newEmail: input.newEmail,

    oldLoginHash: bytesToBase64(input.oldDerivedUserValues.loginHash),
  });
}

export async function changeEmail(input: {
  newEmail: string;
  password: string;
  oldDerivedUserValues: Awaited<ReturnType<typeof deriveUserValues>>;
  emailVerificationCode: string;
}) {
  const newDerivedUserValues = await deriveUserValues(
    input.newEmail,
    input.password,
  );

  const response = (
    await api().post<{
      sessionKey: string;
    }>('/api/users/account/general/change-email', {
      newEmail: input.newEmail,

      oldLoginHash: bytesToBase64(input.oldDerivedUserValues.loginHash),

      emailVerificationCode: input.emailVerificationCode,
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
      .wrapSymmetric(newDerivedUserValues.masterKey, {
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
      .wrapSymmetric(newDerivedUserValues.masterKey, {
        associatedData: {
          context: 'UserSymmetricKeyring',
          userId: authStore().userId,
        },
      }).wrappedValue,
  );

  // Request email change

  await api().post('/api/users/account/general/change-email', {
    newEmail: input.newEmail,

    oldLoginHash: bytesToBase64(newDerivedUserValues.loginHash),
    newLoginHash: bytesToBase64(newDerivedUserValues.loginHash),

    encryptedPrivateKeyring,
    encryptedSymmetricKeyring,

    emailVerificationCode: input.emailVerificationCode,
  });

  if (internals.localStorage.getItem('email') != null) {
    internals.localStorage.setItem('email', input.newEmail);
  }
}
