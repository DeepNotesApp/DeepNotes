import type { UserRegistrationSchema } from '@deepnotes/app-server/src/utils/users';
import type { Keyring } from '@stdlib/crypto';
import { createSymmetricKeyring } from '@stdlib/crypto';
import { textToBytes } from '@stdlib/misc';
import { pack } from 'msgpackr';
import { nanoid } from 'nanoid';
import type { deriveUserValues } from 'src/code/crypto';
import { generateGroupValues, generateRandomUserKeys } from 'src/code/crypto';
import type {
  ISerialArrowInput,
  ISerialObjectInput,
} from 'src/code/pages/serialization';

export async function getRegistrationValues(input: {
  derivedUserValues: Awaited<ReturnType<typeof deriveUserValues>>;
  userName: string;
}): Promise<UserRegistrationSchema> {
  const userId = nanoid();
  const pageId = nanoid();

  const randomUserKeys = generateRandomUserKeys(
    userId,
    input.derivedUserValues.masterKey,
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

    userPublicKeyring: (randomUserKeys.keyPair.publicKey as Keyring)
      .wrappedValue,
    userEncryptedPrivateKeyring:
      randomUserKeys.encryptedPrivateKeyring.wrappedValue,

    userEncryptedSymmetricKeyring:
      randomUserKeys.encryptedSymmetricKeyring.wrappedValue,

    userEncryptedName: randomUserKeys.symmetricKeyring.encrypt(
      textToBytes(input.userName),
      {
        padding: true,
        associatedData: {
          context: 'UserName',
          userId,
        },
      },
    ),

    userEncryptedDefaultNote: randomUserKeys.symmetricKeyring.encrypt(
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
    userEncryptedDefaultArrow: randomUserKeys.symmetricKeyring.encrypt(
      pack({
        color: 'sky',
      } as ISerialArrowInput),
      {
        padding: true,
        associatedData: {
          context: 'UserDefaultArrow',
          userId,
        },
      },
    ),

    groupCreation: {
      groupEncryptedName: new Uint8Array(),
      groupIsPublic: false,

      groupAccessKeyring: groupValues.finalAccessKeyring.wrappedValue,
      groupEncryptedInternalKeyring:
        groupValues.encryptedInternalKeyring.wrappedValue,
      groupEncryptedContentKeyring:
        groupValues.encryptedContentKeyring.wrappedValue,

      groupPublicKeyring: (groupValues.keyPair.publicKey as Keyring)
        .wrappedValue,
      groupEncryptedPrivateKeyring:
        groupValues.encryptedPrivateKeyring.wrappedValue,

      groupOwnerEncryptedName: new Uint8Array(),
    },

    pageCreation: {
      pageEncryptedSymmetricKeyring: pageKeyring.wrappedValue,
      pageEncryptedRelativeTitle: pageKeyring.encrypt(
        textToBytes('Main page'),
        {
          padding: true,
          associatedData: {
            context: 'PageRelativeTitle',
            pageId,
          },
        },
      ),

      pageEncryptedAbsoluteTitle: pageKeyring.encrypt(textToBytes(''), {
        padding: true,
        associatedData: {
          context: 'PageAbsoluteTitle',
          pageId,
        },
      }),
    },
  };
}
