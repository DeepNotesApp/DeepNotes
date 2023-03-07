import { bytesToBase64 } from '@stdlib/base64';
import type { PublicKeyring } from '@stdlib/crypto';
import { createSymmetricKeyring } from '@stdlib/crypto';
import { textToBytes } from '@stdlib/misc';
import { pack } from 'msgpackr';
import { nanoid } from 'nanoid';
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
  const userId = nanoid();
  const pageId = nanoid();

  const randomUserKeys = generateRandomUserKeys(
    userId,
    derivedUserKeys.masterKey,
  );
  const groupValues = await generateGroupValues({
    userKeyPair: randomUserKeys.keyPair,
    isPublic: false,
  });
  const pageKeyring = createSymmetricKeyring();

  return {
    userId,
    groupId: groupValues.groupId,
    pageId,

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

    userEncryptedName: bytesToBase64(
      randomUserKeys.symmetricKeyring.encrypt(textToBytes(userName), {
        padding: true,
        associatedData: {
          context: 'UserName',
          userId,
        },
      }),
    ),

    userEncryptedDefaultNote: bytesToBase64(
      randomUserKeys.symmetricKeyring.encrypt(
        pack({
          root: { noteIdxs: [0] },
          notes: [{}],
        } as ISerialObjectInput),
        {
          padding: true,
          associatedData: {
            context: 'UserDefaultNote',
            userId,
          },
        },
      ),
    ),
    userEncryptedDefaultArrow: bytesToBase64(
      randomUserKeys.symmetricKeyring.encrypt(pack({}), {
        padding: true,
        associatedData: {
          context: 'UserDefaultArrow',
          userId,
        },
      }),
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

    pageEncryptedSymmetricKeyring: bytesToBase64(pageKeyring.fullValue),
    pageEncryptedRelativeTitle: bytesToBase64(
      pageKeyring.encrypt(textToBytes('Main page'), {
        padding: true,
        associatedData: {
          context: 'PageRelativeTitle',
          pageId,
        },
      }),
    ),
    pageEncryptedAbsoluteTitle: bytesToBase64(
      pageKeyring.encrypt(textToBytes(''), {
        padding: true,
        associatedData: {
          context: 'PageAbsoluteTitle',
          pageId,
        },
      }),
    ),
  };
}
