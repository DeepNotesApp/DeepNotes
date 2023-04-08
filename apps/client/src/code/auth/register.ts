import { bytesToBase64 } from '@stdlib/base64';
import type { Keyring } from '@stdlib/crypto';
import { createSymmetricKeyring } from '@stdlib/crypto';
import { textToBytes } from '@stdlib/misc';
import { pack } from 'msgpackr';
import { nanoid } from 'nanoid';
import type { deriveUserValues } from 'src/code/crypto';
import { generateGroupValues, generateRandomUserKeys } from 'src/code/crypto';
import type { ISerialObjectInput } from 'src/code/pages/serialization';

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
      (randomUserKeys.keyPair.publicKey as Keyring).wrappedValue,
    ),
    userEncryptedPrivateKeyring: bytesToBase64(
      randomUserKeys.encryptedPrivateKeyring.wrappedValue,
    ),

    userEncryptedSymmetricKeyring: bytesToBase64(
      randomUserKeys.encryptedSymmetricKeyring.wrappedValue,
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
          notes: [
            {
              anchor: {
                y: 0,
              },
            },
          ],
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
      groupValues.finalAccessKeyring.wrappedValue,
    ),
    groupEncryptedInternalKeyring: bytesToBase64(
      groupValues.encryptedInternalKeyring.wrappedValue,
    ),
    groupEncryptedContentKeyring: bytesToBase64(
      groupValues.encryptedContentKeyring.wrappedValue,
    ),

    groupPublicKeyring: bytesToBase64(
      (groupValues.keyPair.publicKey as Keyring).wrappedValue,
    ),
    groupEncryptedPrivateKeyring: bytesToBase64(
      groupValues.encryptedPrivateKeyring.wrappedValue,
    ),

    pageEncryptedSymmetricKeyring: bytesToBase64(pageKeyring.wrappedValue),
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
