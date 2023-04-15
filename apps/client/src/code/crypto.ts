import type { KeyPair, SymmetricKey } from '@stdlib/crypto';
import { createKeyring } from '@stdlib/crypto';
import { createPrivateKeyring } from '@stdlib/crypto';
import { createSymmetricKeyring } from '@stdlib/crypto';
import { DataLayer } from '@stdlib/crypto';
import { wrapKeyPair } from '@stdlib/crypto';
import { wrapSymmetricKey } from '@stdlib/crypto';
import { nanoidToBytes } from '@stdlib/misc';
import sodium from 'libsodium-wrappers';
import { nanoid } from 'nanoid';
import { GROUP_CONTENT_KEYRING } from 'src/stores/pages';

import { groupContentKeyrings } from './pages/computed/group-content-keyrings';

const moduleLogger = mainLogger().sub('crypto.client.ts');

export async function derivePasswordValues(
  password: string | Uint8Array,
  salt: Uint8Array,
) {
  moduleLogger.info('Started key derivation');

  const derivedKey = (
    await (globalThis as any).argon2.hash({
      pass: password,
      salt,

      hashLen: 32 + 64,

      time: 8,
      mem: 32 * 1024,
      parallelism: 1,

      type: (globalThis as any).argon2.ArgonType.Argon2id,
    })
  ).hash as Uint8Array;

  moduleLogger.info('Finished key derivation');

  return {
    key: wrapSymmetricKey(derivedKey.slice(0, 32)),
    hash: derivedKey.slice(32),
  };
}

export async function deriveUserValues(email: string, password: string) {
  const emailHash = sodium.crypto_generichash(
    sodium.crypto_pwhash_SALTBYTES,
    (process.env.EMAIL_CASE_SENSITIVITY_EXCEPTIONS ?? '')
      .split(';')
      .includes(email)
      ? email
      : email.toLowerCase(),
  );

  const passwordValues = await derivePasswordValues(password, emailHash);

  return {
    masterKey: passwordValues.key,
    loginHash: passwordValues.hash,
  };
}
export function generateRandomUserKeys(
  userId: string,
  masterKey: SymmetricKey,
) {
  const rawKeyPair = sodium.crypto_box_keypair();

  const publicKeyring = createKeyring(rawKeyPair.publicKey);
  const privateKeyring = createPrivateKeyring(rawKeyPair.privateKey);

  const keyPair = wrapKeyPair(publicKeyring, privateKeyring);

  const symmetricKeyring = createSymmetricKeyring();

  return {
    // Asymmetric keys

    keyPair,
    encryptedPrivateKeyring: privateKeyring.wrapSymmetric(masterKey, {
      associatedData: {
        context: 'UserPrivateKeyring',
        userId,
      },
    }),

    // Symmetric key

    symmetricKeyring,
    encryptedSymmetricKeyring: symmetricKeyring.wrapSymmetric(masterKey, {
      associatedData: {
        context: 'UserSymmetricKeyring',
        userId,
      },
    }),
  };
}

export async function generateGroupValues(input: {
  userKeyPair: KeyPair;
  isPublic: boolean;
  password?: string;
}) {
  const groupId = nanoid();

  const accessKeyring = createSymmetricKeyring();
  const internalKeyring = createSymmetricKeyring();
  const contentKeyring = createSymmetricKeyring();

  const rawKeyPair = sodium.crypto_box_keypair();

  const publicKeyring = createKeyring(rawKeyPair.publicKey);
  const privateKeyring = createPrivateKeyring(rawKeyPair.privateKey);

  const keyPair = wrapKeyPair(publicKeyring, privateKeyring);

  // Group keyring

  let finalAccessKeyring = accessKeyring;

  if (!input.isPublic) {
    finalAccessKeyring = finalAccessKeyring.wrapAsymmetric(
      input.userKeyPair,
      input.userKeyPair.publicKey,
    );
  }

  // Internal keyring

  const encryptedInternalKeyring = internalKeyring.wrapAsymmetric(
    input.userKeyPair,
    input.userKeyPair.publicKey,
  );

  // Content keyring

  let encryptedContentKeyring = contentKeyring;

  let passwordValues;

  if (input.password != null) {
    passwordValues = await computeGroupPasswordValues(groupId, input.password);

    encryptedContentKeyring = encryptedContentKeyring.wrapSymmetric(
      passwordValues.passwordKey,
      {
        associatedData: {
          context: 'GroupContentKeyringPasswordProtection',
          groupId,
        },
      },
    );
  }

  encryptedContentKeyring = encryptedContentKeyring.wrapSymmetric(
    accessKeyring,
    {
      associatedData: {
        context: 'GroupContentKeyring',
        groupId,
      },
    },
  );

  return {
    groupId,

    accessKeyring,
    internalKeyring,
    contentKeyring,

    finalAccessKeyring,
    encryptedInternalKeyring,
    encryptedContentKeyring,

    keyPair,
    encryptedPrivateKeyring: privateKeyring.wrapSymmetric(internalKeyring, {
      associatedData: {
        context: 'GroupPrivateKeyring',
        groupId,
      },
    }),

    passwordValues,
  };
}

export async function computeGroupPasswordValues(
  groupId: string,
  groupPassword: string,
) {
  const passwordValues = await derivePasswordValues(
    groupPassword,
    nanoidToBytes(groupId),
  );

  return {
    passwordHash: passwordValues.hash,

    passwordKey: passwordValues.key,
  };
}

export async function unlockGroupContentKeyring(
  groupId: string,
  password: string,
) {
  const groupPasswordValues = await computeGroupPasswordValues(
    groupId,
    password,
  );

  let groupContentKeyring = await groupContentKeyrings()(groupId).getAsync();

  if (groupContentKeyring == null) {
    throw new Error('Group content keyring was not found.');
  }

  if (groupContentKeyring.topLayer === DataLayer.Symmetric) {
    try {
      groupContentKeyring = groupContentKeyring.unwrapSymmetric(
        groupPasswordValues.passwordKey,
        {
          associatedData: {
            context: 'GroupContentKeyringPasswordProtection',
            groupId,
          },
        },
      );
    } catch (error) {
      throw new Error('Password is incorrect.');
    }
  }

  pagesStore().dict[`${GROUP_CONTENT_KEYRING}:${groupId}`] =
    groupContentKeyring;

  return groupContentKeyring;
}
