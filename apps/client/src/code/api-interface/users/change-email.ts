import { createPrivateKeyring, createSymmetricKeyring } from '@stdlib/crypto';
import type {
  finishProcedureStep1,
  finishProcedureStep2,
} from 'deepnotes-app-server-trpc/src/websocket/users/account/email-change/finish';
import { deriveUserValues } from 'src/code/crypto';
import { createWebsocketRequest } from 'src/code/utils/websocket-requests';

export async function changeEmail(input: {
  newEmail: string;
  password: string;
  oldDerivedUserValues: Awaited<ReturnType<typeof deriveUserValues>>;
  emailVerificationCode: string;
}) {
  const { promise } = createWebsocketRequest({
    url: `${process.env.APP_SERVER_TRPC_URL.replaceAll(
      'http',
      'ws',
    )}/users.account.emailChange.finish`,

    steps: [step1, step2, step3],
  });

  function step1(): typeof finishProcedureStep1['_def']['_input_in'] {
    return {
      oldLoginHash: input.oldDerivedUserValues.loginHash,

      emailVerificationCode: input.emailVerificationCode,
    };
  }

  async function step2(
    input_: typeof finishProcedureStep1['_def']['_output_out'],
  ): Promise<typeof finishProcedureStep2['_def']['_input_in']> {
    const newDerivedUserValues = await deriveUserValues({
      email: input.newEmail,
      password: input.password,
    });

    const newEncryptedPrivateKeyring = createPrivateKeyring(
      input_.encryptedPrivateKeyring,
    )
      .unwrapSymmetric(input.oldDerivedUserValues.masterKey, {
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
      .unwrapSymmetric(input.oldDerivedUserValues.masterKey, {
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

      newEncryptedSymmetricKeyring,
      newEncryptedPrivateKeyring,
    };
  }

  async function step3(
    _input: typeof finishProcedureStep2['_def']['_output_out'],
  ) {
    //
  }

  return promise;
}
