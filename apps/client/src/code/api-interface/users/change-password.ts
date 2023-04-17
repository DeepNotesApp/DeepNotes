import { base64ToBytes } from '@stdlib/base64';
import {
  createPrivateKeyring,
  createSymmetricKeyring,
  wrapSymmetricKey,
} from '@stdlib/crypto';
import type {
  changePasswordProcedureStep1,
  changePasswordProcedureStep2,
} from 'deepnotes-app-server-trpc/src/api/users/account/change-password';
import { pack, unpack } from 'msgpackr';
import { deriveUserValues } from 'src/code/crypto';

export async function changePassword(input: {
  oldPassword: string;
  newPassword: string;
}) {
  return new Promise<void>(async (resolve, reject) => {
    // Get user email

    const email = await internals.realtime.hget(
      'user',
      authStore().userId,
      'email',
    );

    // Compute derived keys

    const oldDerivedValues = await deriveUserValues(email, input.oldPassword);

    const socket = new WebSocket(
      `${process.env.APP_SERVER_TRPC_URL.replaceAll(
        'http',
        'ws',
      )}/users.account.changePassword`,
    );

    socket.binaryType = 'arraybuffer';

    socket.addEventListener('error', (event) => {
      console.error('Websocket error:', event);
    });

    socket.addEventListener('open', () => {
      const request: typeof changePasswordProcedureStep1['_def']['_input_in'] =
        { oldLoginHash: oldDerivedValues.loginHash };

      socket.send(pack(request));
    });

    let step = 1;

    socket.addEventListener('message', async (event) => {
      mainLogger.info('changePassword step %d: received message', step);

      if (step === 1) {
        const response: {
          success: boolean;
          output: typeof changePasswordProcedureStep1['_def']['_output_out'];
          error?: string;
        } = unpack(new Uint8Array(event.data));

        if (!response.success) {
          socket.close();
          reject(new Error(response.error!));
          return;
        }

        const request = await changePasswordStep1({
          ...response.output,

          email,
          newPassword: input.newPassword,
        });

        socket.send(pack(request));
      } else if (step === 2) {
        const response: {
          success: boolean;
          output: typeof changePasswordProcedureStep2['_def']['_output_out'];
          error?: string;
        } = unpack(new Uint8Array(event.data));

        if (!response.success) {
          socket.close();
          reject(new Error(response.error!));
          return;
        }

        await changePasswordStep2(response.output);

        socket.close();
        resolve();
      } else {
        socket.close();
        reject(new Error('Unexpected step'));
      }

      step++;
    });
  });
}

async function changePasswordStep1(
  input: typeof changePasswordProcedureStep1['_def']['_output_out'] & {
    newPassword: string;
    email: string;
  },
): Promise<typeof changePasswordProcedureStep2['_def']['_input_in']> {
  const newDerivedValues = await deriveUserValues(
    input.email,
    input.newPassword,
  );

  const wrappedSessionKey = wrapSymmetricKey(input.sessionKey);

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

async function changePasswordStep2(
  _: typeof changePasswordProcedureStep2['_def']['_output_out'],
) {
  //
}
