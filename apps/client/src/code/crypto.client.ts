import type { KeyPair, SymmetricKey } from '@stdlib/crypto';
import { createPublicKeyring } from '@stdlib/crypto';
import { createPrivateKeyring } from '@stdlib/crypto';
import { createSymmetricKeyring } from '@stdlib/crypto';
import { DataLayer } from '@stdlib/crypto';
import { wrapKeyPair } from '@stdlib/crypto';
import { wrapSymmetricKey } from '@stdlib/crypto';
import { nanoidToBytes } from '@stdlib/misc';
import sodium from 'libsodium-wrappers';
import { nanoid } from 'nanoid';
import { GROUP_CONTENT_KEYRING } from 'src/stores/pages';

import { groupContentKeyrings } from './pages/computed/group-content-keyrings.client';

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
  ).hash;

  moduleLogger.info('Finished key derivation');

  return {
    key: wrapSymmetricKey(derivedKey.slice(0, 32)),
    hash: derivedKey.slice(32),
  };
}

export async function deriveUserValues(email: string, password: string) {
  const emailHash = sodium.crypto_generichash(
    sodium.crypto_pwhash_SALTBYTES,
    email,
  );

  const passwordValues = await derivePasswordValues(password, emailHash);

  return {
    masterKey: passwordValues.key,
    loginHash: passwordValues.hash,
  };
}
export function generateRandomUserKeys(masterKey: SymmetricKey) {
  const rawKeyPair = sodium.crypto_box_keypair();

  const publicKeyring = createPublicKeyring(rawKeyPair.publicKey);
  const privateKeyring = createPrivateKeyring(rawKeyPair.privateKey);

  const keyPair = wrapKeyPair(publicKeyring, privateKeyring);

  const symmetricKeyring = createSymmetricKeyring();

  return {
    // Asymmetric keys

    keyPair,
    encryptedPrivateKeyring: privateKeyring.wrapSymmetric(masterKey),

    // Symmetric key

    symmetricKeyring,
    encryptedSymmetricKeyring: symmetricKeyring.wrapSymmetric(masterKey),
  };
}

export async function generateGroupValues({
  userKeyPair,
  isPublic,
  password,
}: {
  userKeyPair: KeyPair;
  isPublic: boolean;
  password?: string;
}) {
  const groupId = nanoid();

  const accessKeyring = createSymmetricKeyring();
  const internalKeyring = createSymmetricKeyring();
  const contentKeyring = createSymmetricKeyring();

  const rawKeyPair = sodium.crypto_box_keypair();

  const publicKeyring = createPublicKeyring(rawKeyPair.publicKey);
  const privateKeyring = createPrivateKeyring(rawKeyPair.privateKey);

  const keyPair = wrapKeyPair(publicKeyring, privateKeyring);

  // Group keyring

  let finalAccessKeyring = accessKeyring;

  if (!isPublic) {
    finalAccessKeyring = finalAccessKeyring.wrapAsymmetric(
      userKeyPair,
      userKeyPair.publicKey,
    );
  }

  // Internal keyring

  const encryptedInternalKeyring = internalKeyring.wrapAsymmetric(
    userKeyPair,
    userKeyPair.publicKey,
  );

  // Content keyring

  let encryptedContentKeyring = contentKeyring;

  let passwordValues;

  if (password != null) {
    passwordValues = await computeGroupPasswordValues(groupId, password);

    encryptedContentKeyring = encryptedContentKeyring.wrapSymmetric(
      passwordValues.passwordKey,
    );
  }

  encryptedContentKeyring =
    encryptedContentKeyring.wrapSymmetric(accessKeyring);

  return {
    groupId,

    accessKeyring,
    internalKeyring,
    contentKeyring,

    finalAccessKeyring,
    encryptedInternalKeyring,
    encryptedContentKeyring,

    keyPair,
    encryptedPrivateKeyring: privateKeyring.wrapSymmetric(internalKeyring),

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
      );
    } catch (error) {
      throw new Error('Password is incorrect.');
    }
  }

  pagesStore().dict[`${GROUP_CONTENT_KEYRING}:${groupId}`] =
    groupContentKeyring;

  return groupContentKeyring;
}
