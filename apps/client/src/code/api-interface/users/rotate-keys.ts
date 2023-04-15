import { base64ToBytes, bytesToBase64 } from '@stdlib/base64';
import {
  createKeyring,
  createPrivateKeyring,
  createSymmetricKeyring,
  wrapKeyPair,
} from '@stdlib/crypto';
import sodium from 'libsodium-wrappers';
import { deriveUserValues } from 'src/code/crypto';

export async function rotateUserKeys(input: { password: string }) {
  const derivedValues = await deriveUserValues(
    await internals.realtime.hget('user', authStore().userId, 'email'),
    input.password,
  );

  const keyRotationValues = (
    await api().post<{
      email: string;

      userEncryptedSymmetricKeyring: string;
      userEncryptedPrivateKeyring: string;
      userPublicKeyring: string;

      userEncryptedDefaultNote: string;
      userEncryptedDefaultArrow: string;
      userEncryptedName: string;

      groupJoinRequests: Record<string, { encryptedNameForUser: string }>;
      groupJoinInvitations: Record<
        string,
        {
          encryptedAccessKeyring: string;
          encryptedInternalKeyring: string;
        }
      >;
      groupMembers: Record<
        string,
        {
          encryptedAccessKeyring: string;
          encryptedInternalKeyring: string;
        }
      >;
    }>('/api/users/account/security/rotate-keys', {
      loginHash: bytesToBase64(derivedValues.loginHash),
    })
  ).data;

  const oldSymmetricKeyring = createSymmetricKeyring(
    base64ToBytes(keyRotationValues.userEncryptedSymmetricKeyring),
  ).unwrapSymmetric(derivedValues.masterKey, {
    associatedData: {
      context: 'UserSymmetricKeyring',
      userId: authStore().userId,
    },
  });
  const oldPrivateKeyring = createPrivateKeyring(
    base64ToBytes(keyRotationValues.userEncryptedPrivateKeyring),
  ).unwrapSymmetric(derivedValues.masterKey, {
    associatedData: {
      context: 'UserPrivateKeyring',
      userId: authStore().userId,
    },
  });
  const oldPublicKeyring = createKeyring(
    base64ToBytes(keyRotationValues.userPublicKeyring),
  );

  const newSymmetricKeyring = oldSymmetricKeyring.addKey();

  const newRawKeyPair = sodium.crypto_box_keypair();
  const newPrivateKeyring = oldPrivateKeyring.addKey(newRawKeyPair.privateKey);
  const newPublicKeyring = oldPublicKeyring.addKey(newRawKeyPair.publicKey);
  const newKeyPair = wrapKeyPair(newPublicKeyring, newPrivateKeyring);

  await api().post('/api/users/account/security/rotate-keys', {
    loginHash: bytesToBase64(derivedValues.loginHash),

    userEncryptedSymmetricKeyring: bytesToBase64(
      newSymmetricKeyring.wrapSymmetric(derivedValues.masterKey, {
        associatedData: {
          context: 'UserSymmetricKeyring',
          userId: authStore().userId,
        },
      }).wrappedValue,
    ),
    userEncryptedPrivateKeyring: bytesToBase64(
      newPrivateKeyring.wrapSymmetric(derivedValues.masterKey, {
        associatedData: {
          context: 'UserPrivateKeyring',
          userId: authStore().userId,
        },
      }).wrappedValue,
    ),
    userPublicKeyring: bytesToBase64(newPublicKeyring.wrappedValue),

    userEncryptedDefaultNote: bytesToBase64(
      newSymmetricKeyring.encrypt(
        oldSymmetricKeyring.decrypt(
          base64ToBytes(keyRotationValues.userEncryptedDefaultNote),
          {
            associatedData: {
              context: 'UserDefaultNote',
              userId: authStore().userId,
            },
          },
        ),
        {
          associatedData: {
            context: 'UserDefaultNote',
            userId: authStore().userId,
          },
        },
      ),
    ),
    userEncryptedDefaultArrow: bytesToBase64(
      newSymmetricKeyring.encrypt(
        oldSymmetricKeyring.decrypt(
          base64ToBytes(keyRotationValues.userEncryptedDefaultArrow),
          {
            associatedData: {
              context: 'UserDefaultArrow',
              userId: authStore().userId,
            },
          },
        ),
        {
          associatedData: {
            context: 'UserDefaultArrow',
            userId: authStore().userId,
          },
        },
      ),
    ),
    userEncryptedName: bytesToBase64(
      newSymmetricKeyring.encrypt(
        oldSymmetricKeyring.decrypt(
          base64ToBytes(keyRotationValues.userEncryptedName),
          {
            associatedData: {
              context: 'UserName',
              userId: authStore().userId,
            },
          },
        ),
        {
          associatedData: {
            context: 'UserName',
            userId: authStore().userId,
          },
        },
      ),
    ),

    groupJoinRequests: Object.fromEntries(
      Object.entries(keyRotationValues.groupJoinRequests).map(
        ([groupId, { encryptedNameForUser }]) => [
          groupId,
          {
            encryptedNameForUser: bytesToBase64(
              newSymmetricKeyring.encrypt(
                oldSymmetricKeyring.decrypt(
                  base64ToBytes(encryptedNameForUser),
                  {
                    padding: true,
                    associatedData: {
                      context: 'GroupJoinRequestUserNameForUser',
                      groupId,
                      userId: authStore().userId,
                    },
                  },
                ),
                {
                  padding: true,
                  associatedData: {
                    context: 'GroupJoinRequestUserNameForUser',
                    groupId,
                    userId: authStore().userId,
                  },
                },
              ),
            ),
          },
        ],
      ),
    ),
    groupJoinInvitations: Object.fromEntries(
      Object.entries(keyRotationValues.groupJoinInvitations).map(
        ([groupId, { encryptedAccessKeyring, encryptedInternalKeyring }]) => [
          groupId,
          {
            encryptedAccessKeyring: bytesToBase64(
              createSymmetricKeyring(base64ToBytes(encryptedAccessKeyring))
                .unwrapAsymmetric(oldPrivateKeyring)
                .wrapAsymmetric(newKeyPair, newPublicKeyring).wrappedValue,
            ),
            encryptedInternalKeyring: bytesToBase64(
              createSymmetricKeyring(base64ToBytes(encryptedInternalKeyring))
                .unwrapAsymmetric(oldPrivateKeyring)
                .wrapAsymmetric(newKeyPair, newPublicKeyring).wrappedValue,
            ),
          },
        ],
      ),
    ),
    groupMembers: Object.fromEntries(
      Object.entries(keyRotationValues.groupMembers).map(
        ([groupId, { encryptedAccessKeyring, encryptedInternalKeyring }]) => [
          groupId,
          {
            encryptedAccessKeyring: bytesToBase64(
              createSymmetricKeyring(base64ToBytes(encryptedAccessKeyring))
                .unwrapAsymmetric(oldPrivateKeyring)
                .wrapAsymmetric(newKeyPair, newPublicKeyring).wrappedValue,
            ),
            encryptedInternalKeyring: bytesToBase64(
              createSymmetricKeyring(base64ToBytes(encryptedInternalKeyring))
                .unwrapAsymmetric(oldPrivateKeyring)
                .wrapAsymmetric(newKeyPair, newPublicKeyring).wrappedValue,
            ),
          },
        ],
      ),
    ),
  });
}
