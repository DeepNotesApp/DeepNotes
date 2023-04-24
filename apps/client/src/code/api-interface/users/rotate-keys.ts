import {
  createKeyring,
  createPrivateKeyring,
  createSymmetricKeyring,
  wrapKeyPair,
} from '@stdlib/crypto';
import type {
  rotateKeysProcedureStep1,
  rotateKeysProcedureStep2,
} from 'deepnotes-app-server/src/websocket/users/account/rotate-keys';
import sodium from 'libsodium-wrappers';
import { deriveUserValues } from 'src/code/crypto';
import { createWebsocketRequest } from 'src/code/utils/websocket-requests';

export async function rotateUserKeys(input: { password: string }) {
  // Get user email

  const email = await internals.realtime.hget(
    'user',
    authStore().userId,
    'email',
  );

  // Compute derived keys

  const derivedUserValues = await deriveUserValues({
    email,
    password: input.password,
  });

  // Create websocket request

  const { promise } = createWebsocketRequest({
    url: `${process.env.APP_SERVER_URL.replaceAll(
      'http',
      'ws',
    )}/users.account.rotateKeys`,

    steps: [step1, step2, step3],
  });

  function step1(): typeof rotateKeysProcedureStep1['_def']['_input_in'] {
    return {
      loginHash: derivedUserValues.loginHash,
    };
  }

  async function step2(
    input: typeof rotateKeysProcedureStep1['_def']['_output_out'],
  ): Promise<typeof rotateKeysProcedureStep2['_def']['_input_in']> {
    const oldSymmetricKeyring = createSymmetricKeyring(
      input.userEncryptedSymmetricKeyring,
    ).unwrapSymmetric(derivedUserValues.masterKey, {
      associatedData: {
        context: 'UserSymmetricKeyring',
        userId: authStore().userId,
      },
    });
    const oldPrivateKeyring = createPrivateKeyring(
      input.userEncryptedPrivateKeyring,
    ).unwrapSymmetric(derivedUserValues.masterKey, {
      associatedData: {
        context: 'UserPrivateKeyring',
        userId: authStore().userId,
      },
    });
    const oldPublicKeyring = createKeyring(input.userPublicKeyring);

    const newSymmetricKeyring = oldSymmetricKeyring.addKey();

    const newRawKeyPair = sodium.crypto_box_keypair();
    const newPrivateKeyring = oldPrivateKeyring.addKey(
      newRawKeyPair.privateKey,
    );
    const newPublicKeyring = oldPublicKeyring.addKey(newRawKeyPair.publicKey);
    const newKeyPair = wrapKeyPair(newPublicKeyring, newPrivateKeyring);

    return {
      userEncryptedSymmetricKeyring: newSymmetricKeyring.wrapSymmetric(
        derivedUserValues.masterKey,
        {
          associatedData: {
            context: 'UserSymmetricKeyring',
            userId: authStore().userId,
          },
        },
      ).wrappedValue,
      userEncryptedPrivateKeyring: newPrivateKeyring.wrapSymmetric(
        derivedUserValues.masterKey,
        {
          associatedData: {
            context: 'UserPrivateKeyring',
            userId: authStore().userId,
          },
        },
      ).wrappedValue,
      userPublicKeyring: newPublicKeyring.wrappedValue,

      userEncryptedDefaultNote: newSymmetricKeyring.encrypt(
        oldSymmetricKeyring.decrypt(input.userEncryptedDefaultNote, {
          associatedData: {
            context: 'UserDefaultNote',
            userId: authStore().userId,
          },
        }),
        {
          associatedData: {
            context: 'UserDefaultNote',
            userId: authStore().userId,
          },
        },
      ),
      userEncryptedDefaultArrow: newSymmetricKeyring.encrypt(
        oldSymmetricKeyring.decrypt(input.userEncryptedDefaultArrow, {
          associatedData: {
            context: 'UserDefaultArrow',
            userId: authStore().userId,
          },
        }),
        {
          associatedData: {
            context: 'UserDefaultArrow',
            userId: authStore().userId,
          },
        },
      ),
      userEncryptedName: newSymmetricKeyring.encrypt(
        oldSymmetricKeyring.decrypt(input.userEncryptedName, {
          associatedData: {
            context: 'UserName',
            userId: authStore().userId,
          },
        }),
        {
          associatedData: {
            context: 'UserName',
            userId: authStore().userId,
          },
        },
      ),

      groupJoinRequests: Object.fromEntries(
        Object.entries(input.groupJoinRequests).map(
          ([groupId, { encryptedNameForUser }]) => [
            groupId,
            {
              encryptedNameForUser: newSymmetricKeyring.encrypt(
                oldSymmetricKeyring.decrypt(encryptedNameForUser, {
                  padding: true,
                  associatedData: {
                    context: 'GroupJoinRequestUserNameForUser',
                    groupId,
                    userId: authStore().userId,
                  },
                }),
                {
                  padding: true,
                  associatedData: {
                    context: 'GroupJoinRequestUserNameForUser',
                    groupId,
                    userId: authStore().userId,
                  },
                },
              ),
            },
          ],
        ),
      ),
      groupJoinInvitations: Object.fromEntries(
        Object.entries(input.groupJoinInvitations).map(
          ([groupId, { encryptedAccessKeyring, encryptedInternalKeyring }]) => [
            groupId,
            {
              encryptedAccessKeyring:
                encryptedAccessKeyring != null
                  ? createSymmetricKeyring(encryptedAccessKeyring)
                      .unwrapAsymmetric(oldPrivateKeyring)
                      .wrapAsymmetric(newKeyPair, newPublicKeyring).wrappedValue
                  : null,
              encryptedInternalKeyring: createSymmetricKeyring(
                encryptedInternalKeyring,
              )
                .unwrapAsymmetric(oldPrivateKeyring)
                .wrapAsymmetric(newKeyPair, newPublicKeyring).wrappedValue,
            },
          ],
        ),
      ),
      groupMembers: Object.fromEntries(
        Object.entries(input.groupMembers).map(
          ([groupId, { encryptedAccessKeyring, encryptedInternalKeyring }]) => [
            groupId,
            {
              encryptedAccessKeyring:
                encryptedAccessKeyring != null
                  ? createSymmetricKeyring(encryptedAccessKeyring)
                      .unwrapAsymmetric(oldPrivateKeyring)
                      .wrapAsymmetric(newKeyPair, newPublicKeyring).wrappedValue
                  : null,
              encryptedInternalKeyring: createSymmetricKeyring(
                encryptedInternalKeyring,
              )
                .unwrapAsymmetric(oldPrivateKeyring)
                .wrapAsymmetric(newKeyPair, newPublicKeyring).wrappedValue,
            },
          ],
        ),
      ),
    };
  }

  async function step3(
    _input: typeof rotateKeysProcedureStep2['_def']['_output_out'],
  ) {
    //
  }

  return promise;
}
