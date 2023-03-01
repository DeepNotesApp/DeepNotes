import { bytesToBase64 } from '@stdlib/base64';
import type { PublicKeyring } from '@stdlib/crypto';
import { createSymmetricKeyring } from '@stdlib/crypto';
import { textToBytes } from '@stdlib/misc';
import { pack } from 'msgpackr';
import type { deriveUserValues } from 'src/code/crypto.client';
import {
  generateGroupValues,
  generateRandomUserKeys,
} from 'src/code/crypto.client';
import type { ISerialObjectInput } from 'src/code/pages/serialization.client';

export async function getRegistrationValues(
  derivedUserKeys: Awaited<ReturnType<typeof deriveUserValues>>,
  userName: string,
) {
  const randomUserKeys = generateRandomUserKeys(derivedUserKeys.masterKey);
  const groupValues = await generateGroupValues({
    userKeyPair: randomUserKeys.keyPair,
    isPublic: false,
  });
  const pageKeyring = createSymmetricKeyring();

  return {
    loginHash: bytesToBase64(derivedUserKeys.loginHash),

    userPublicKeyring: bytesToBase64(
      (randomUserKeys.keyPair.publicKey as PublicKeyring).fullValue,
    ),
    userEncryptedPrivateKeyring: bytesToBase64(
      randomUserKeys.encryptedPrivateKeyring.fullValue,
    ),

    userEncryptedSymmetricKeyring: bytesToBase64(
      randomUserKeys.encryptedSymmetricKeyring.fullValue,
    ),

    userEncryptedDefaultNote: bytesToBase64(
      randomUserKeys.symmetricKeyring.encrypt(
        pack({
          root: { noteIdxs: [0] },
          notes: [{}],
        } as ISerialObjectInput),
        { padding: true },
      ),
    ),
    userEncryptedDefaultArrow: bytesToBase64(
      randomUserKeys.symmetricKeyring.encrypt(pack({}), { padding: true }),
    ),

    groupEncryptedAccessKeyring: bytesToBase64(
      groupValues.finalAccessKeyring.fullValue,
    ),
    groupEncryptedInternalKeyring: bytesToBase64(
      groupValues.encryptedInternalKeyring.fullValue,
    ),
    groupEncryptedContentKeyring: bytesToBase64(
      groupValues.encryptedContentKeyring.fullValue,
    ),

    groupPublicKeyring: bytesToBase64(
      (groupValues.keyPair.publicKey as PublicKeyring).fullValue,
    ),
    groupEncryptedPrivateKeyring: bytesToBase64(
      groupValues.encryptedPrivateKeyring.fullValue,
    ),

    groupMemberEncryptedName: bytesToBase64(
      randomUserKeys.symmetricKeyring.encrypt(textToBytes(userName)),
    ),

    mainPageEncryptedSymmetricKeyring: bytesToBase64(pageKeyring.fullValue),
    mainPageEncryptedRelativeTitle: bytesToBase64(
      pageKeyring.encrypt(textToBytes('Main page'), { padding: true }),
    ),
    mainPageEncryptedAbsoluteTitle: bytesToBase64(
      pageKeyring.encrypt(textToBytes(''), { padding: true }),
    ),
  };
}
