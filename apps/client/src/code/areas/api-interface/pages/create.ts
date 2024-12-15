import type { Keyring, SymmetricKeyring } from '@stdlib/crypto';
import { createSymmetricKeyring } from '@stdlib/crypto';
import { DataLayer } from '@stdlib/crypto';
import { textToBytes } from '@stdlib/misc';
import { nanoid } from 'nanoid';
import {
  generateGroupValues,
  unlockGroupContentKeyring,
} from 'src/code/crypto';
import { groupContentKeyrings } from 'src/code/pages/computed/group-content-keyrings';
import { asyncDialog } from 'src/code/utils/misc';
import { zxcvbn } from 'src/code/utils/zxcvbn';

export async function createPage(input: {
  parentPageId: string;
  destGroupId: string;

  pageRelativeTitle: string;
  pageAbsoluteTitle?: string;

  createGroup?: {
    groupName: string;
    groupMemberName: string;
    groupIsPublic: boolean;
    groupPassword?: string;
  };
}) {
  let groupContentKeyring: SymmetricKeyring | undefined;

  const pageId = nanoid();

  let groupId;

  let groupCreation: Parameters<
    typeof trpcClient.pages.create.mutate
  >[0]['groupCreation'];

  if (input.createGroup != null) {
    if (input.createGroup.groupName === '') {
      throw new Error('Please enter a group name.');
    }

    if (input.createGroup.groupMemberName === '') {
      throw new Error('Please enter an user alias.');
    }

    if (
      input.createGroup.groupPassword != null &&
      zxcvbn(input.createGroup.groupPassword).score <= 2
    ) {
      await asyncDialog({
        title: 'Weak password',
        html: true,
        message:
          'Your password is relatively weak.<br/>Are you sure you want to continue?',
        style: { width: 'max-content', padding: '4px 8px' },

        focus: 'cancel',

        cancel: { label: 'No', flat: true, color: 'primary' },
        ok: { label: 'Yes', flat: true, color: 'negative' },
      });
    }

    const groupValues = await generateGroupValues({
      userKeyPair: internals.keyPair,
      isPublic: input.createGroup.groupIsPublic,
      password:
        input.createGroup.groupPassword != null
          ? input.createGroup.groupPassword
          : undefined,
    });

    groupId = groupValues.groupId;

    groupContentKeyring = groupValues.contentKeyring;

    groupCreation = {
      groupEncryptedName: groupValues.accessKeyring.encrypt(
        textToBytes(input.createGroup.groupName),
        {
          padding: true,
          associatedData: {
            context: 'GroupName',
            groupId: groupValues.groupId,
          },
        },
      ),

      groupPasswordHash: groupValues.passwordValues?.passwordHash,

      groupIsPublic: input.createGroup.groupIsPublic,

      groupAccessKeyring: groupValues.finalAccessKeyring.wrappedValue,
      groupEncryptedInternalKeyring:
        groupValues.encryptedInternalKeyring.wrappedValue,
      groupEncryptedContentKeyring:
        groupValues.encryptedContentKeyring.wrappedValue,

      groupPublicKeyring: (groupValues.keyPair.publicKey as Keyring)
        .wrappedValue,
      groupEncryptedPrivateKeyring:
        groupValues.encryptedPrivateKeyring.wrappedValue,

      groupOwnerEncryptedName: internals.keyPair.encrypt(
        textToBytes(input.createGroup.groupMemberName),
        groupValues.keyPair.publicKey,
        { padding: true },
      ),
    };
  } else {
    groupId = input.destGroupId;

    groupContentKeyring = await groupContentKeyrings()(groupId).getAsync();

    if (groupContentKeyring?.topLayer === DataLayer.Symmetric) {
      const destGroupPassword = await asyncDialog<string>({
        title: 'Destination group password',
        message: 'Enter the destination group password:',
        color: 'primary',
        prompt: {
          type: 'password',
          model: '',
          filled: true,
        },
        style: {
          maxWidth: '350px',
        },
        cancel: true,
      });

      groupContentKeyring = await unlockGroupContentKeyring(
        groupId,
        destGroupPassword,
      );
    }
  }

  if (groupContentKeyring?.topLayer !== DataLayer.Raw) {
    throw new Error('Invalid group content keyring.');
  }

  const pageKeyring = createSymmetricKeyring();

  const pageEncryptedSymmetricKeyring = pageKeyring.wrapSymmetric(
    groupContentKeyring,
    {
      associatedData: {
        context: 'PageKeyring',
        pageId,
      },
    },
  ).wrappedValue;
  const pageEncryptedRelativeTitle = pageKeyring.encrypt(
    textToBytes(input.pageRelativeTitle),
    {
      padding: true,
      associatedData: {
        context: 'PageRelativeTitle',
        pageId,
      },
    },
  );
  const pageEncryptedAbsoluteTitle = pageKeyring.encrypt(
    textToBytes(input.pageAbsoluteTitle ?? ''),
    {
      padding: true,
      associatedData: {
        context: 'PageAbsoluteTitle',
        pageId,
      },
    },
  );

  return await trpcClient.pages.create.mutate({
    parentPageId: input.parentPageId,
    groupId,
    pageId,

    pageEncryptedSymmetricKeyring,
    pageEncryptedRelativeTitle,
    pageEncryptedAbsoluteTitle,

    groupCreation,
  });
}
