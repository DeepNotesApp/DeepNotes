import { createPrivateKeyring, createSymmetricKeyring } from '@stdlib/crypto';
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
  // Get user email

  const email = await internals.realtime.hget(
    'user',
    authStore().userId,
    'email',
  );

  // Compute derived keys

  const oldDerivedUserValues = await deriveUserValues({
    email,
    password: input.oldPassword,
  });

  const { promise } = createWebsocketRequest({
    url: `${process.env.APP_SERVER_TRPC_URL.replaceAll(
      'http',
      'ws',
    )}/users.account.changePassword`,

    steps: [step1, step2, step3],
  });

  function step1(): typeof changePasswordProcedureStep1['_def']['_input_in'] {
    return {
      oldLoginHash: oldDerivedUserValues.loginHash,
    };
  }

  async function step2(
    input_: typeof changePasswordProcedureStep1['_def']['_output_out'],
  ): Promise<typeof changePasswordProcedureStep2['_def']['_input_in']> {
    const newDerivedUserValues = await deriveUserValues({
      email,
      password: input.newPassword,
    });

    // Reencrypt values

    const newEncryptedPrivateKeyring = createPrivateKeyring(
      input_.encryptedPrivateKeyring,
    )
      .unwrapSymmetric(oldDerivedUserValues.masterKey, {
        associatedData: {
          context: 'UserPrivateKeyring',
          userId: authStore().userId,
        },
      })
      .wrapSymmetric(newDerivedUserValues.masterKey, {
        associatedData: {
          context: 'UserPrivateKeyring',
          userId: authStore().userId,
        },
      }).wrappedValue;
    const newEncryptedSymmetricKeyring = createSymmetricKeyring(
      input_.encryptedSymmetricKeyring,
    )
      .unwrapSymmetric(oldDerivedUserValues.masterKey, {
        associatedData: {
          context: 'UserSymmetricKeyring',
          userId: authStore().userId,
        },
      })
      .wrapSymmetric(newDerivedUserValues.masterKey, {
        associatedData: {
          context: 'UserSymmetricKeyring',
          userId: authStore().userId,
        },
      }).wrappedValue;

    return {
      newLoginHash: newDerivedUserValues.loginHash,

      newEncryptedPrivateKeyring,
      newEncryptedSymmetricKeyring,
    };
  }

  async function step3(
    _input: typeof changePasswordProcedureStep2['_def']['_output_out'],
  ) {
    //
  }

  return promise;
}
