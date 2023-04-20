import type { Keyring, SymmetricKeyring } from '@stdlib/crypto';
import { createSymmetricKeyring } from '@stdlib/crypto';
import { DataLayer } from '@stdlib/crypto';
import { textToBytes } from '@stdlib/misc';
import { zxcvbn } from '@zxcvbn-ts/core';
import { nanoid } from 'nanoid';
import {
  generateGroupValues,
  unlockGroupContentKeyring,
} from 'src/code/crypto';
import { groupContentKeyrings } from 'src/code/pages/computed/group-content-keyrings';
import { asyncPrompt } from 'src/code/utils/misc';

export async function createPage(input: {
  parentPageId: string;
  currentGroupId: string;
  pageRelativeTitle: string;

  createGroup: boolean;
  groupName: string;
  groupMemberName: string;
  groupIsPublic: boolean;
  groupPassword?: string;
}) {
  let groupContentKeyring: SymmetricKeyring | undefined;

  const pageId = nanoid();

  let groupId;

  let groupCreation: Parameters<
    typeof trpcClient.pages.create.mutate
  >[0]['groupCreation'];

  if (input.createGroup) {
    if (input.groupName === '') {
      throw new Error('Please enter a group name.');
    }

    if (input.groupMemberName === '') {
      throw new Error('Please enter an user alias.');
    }

    if (input.groupPassword != null && zxcvbn(input.groupPassword).score <= 2) {
      await asyncPrompt({
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
      isPublic: input.groupIsPublic,
      password: input.groupPassword != null ? input.groupPassword : undefined,
    });

    groupId = groupValues.groupId;

    groupContentKeyring = groupValues.contentKeyring;

    groupCreation = {
      groupEncryptedName: groupValues.accessKeyring.encrypt(
        textToBytes(input.groupName),
        {
          padding: true,
          associatedData: {
            context: 'GroupName',
            groupId: groupValues.groupId,
          },
        },
      ),

      groupPasswordHash: groupValues.passwordValues?.passwordHash,

      groupIsPublic: input.groupIsPublic,

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
        textToBytes(input.groupMemberName),
        groupValues.keyPair.publicKey,
        { padding: true },
      ),
    };
  } else {
    groupId = input.currentGroupId;

    groupContentKeyring = await groupContentKeyrings()(
      input.currentGroupId,
    ).getAsync();

    if (groupContentKeyring?.topLayer === DataLayer.Symmetric) {
      const destGroupPassword = await asyncPrompt<string>({
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
        input.currentGroupId,
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
  const pageEncryptedAbsoluteTitle = pageKeyring.encrypt(textToBytes(''), {
    padding: true,
    associatedData: {
      context: 'PageAbsoluteTitle',
      pageId,
    },
  });

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
