import { base64ToBytes } from '@stdlib/base64';
import {
  createPrivateKeyring,
  createSymmetricKeyring,
  wrapSymmetricKey,
} from '@stdlib/crypto';
import type {
  changePasswordProcedureStep1,
  changePasswordProcedureStep2,
} from 'deepnotes-app-server-trpc/src/websocket/users/account/change-password';
import { deriveUserValues } from 'src/code/crypto';
import { createWebsocketRequest } from 'src/code/utils/websocket-requests';

export async function changePassword(input: {
  oldPassword: string;
  newPassword: string;
}) {
  const { promise } = createWebsocketRequest({
    url: `${process.env.APP_SERVER_TRPC_URL.replaceAll(
      'http',
      'ws',
    )}/users.account.changePassword`,

    steps: [step1, step2, step3],
  });

  // Get user email

  const email = await internals.realtime.hget(
    'user',
    authStore().userId,
    'email',
  );

  // Compute derived keys

  const oldDerivedValues = await deriveUserValues(email, input.oldPassword);

  function step1(): typeof changePasswordProcedureStep1['_def']['_input_in'] {
    return {
      oldLoginHash: oldDerivedValues.loginHash,
    };
  }

  async function step2(
    input_: typeof changePasswordProcedureStep1['_def']['_output_out'],
  ): Promise<typeof changePasswordProcedureStep2['_def']['_input_in']> {
    const newDerivedValues = await deriveUserValues(email, input.newPassword);

    const wrappedSessionKey = wrapSymmetricKey(input_.sessionKey);

    // Reencrypt values

    const encryptedPrivateKeyring = createPrivateKeyring(
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
      }).wrappedValue;

    const encryptedSymmetricKeyring = createSymmetricKeyring(
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
      }).wrappedValue;

    return {
      newLoginHash: newDerivedValues.loginHash,

      encryptedPrivateKeyring,
      encryptedSymmetricKeyring,
    };
  }

  async function step3(
    _input: typeof changePasswordProcedureStep2['_def']['_output_out'],
  ) {
    //
  }

  return promise;
}
