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
  pageId: string;
  currentGroupId: string;
  pageRelativeTitle: string;

  createGroup: boolean;
  groupName: string;
  groupMemberName: string;
  groupIsPublic: boolean;
  groupPassword?: string;
}) {
  let groupContentKeyring: SymmetricKeyring | undefined;

  const request = {} as Parameters<typeof trpcClient.pages.create.mutate>[0];

  request.parentPageId = input.pageId;

  request.pageId = nanoid();

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

    request.groupId = groupValues.groupId;

    groupContentKeyring = groupValues.contentKeyring;

    request.groupCreation = {
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

      accessKeyring: groupValues.finalAccessKeyring.wrappedValue,
      groupEncryptedInternalKeyring:
        groupValues.encryptedInternalKeyring.wrappedValue,
      groupEncryptedContentKeyring:
        groupValues.encryptedContentKeyring.wrappedValue,

      groupPublicKeyring: (groupValues.keyPair.publicKey as Keyring)
        .wrappedValue,
      groupEncryptedPrivateKeyring:
        groupValues.encryptedPrivateKeyring.wrappedValue,

      groupMemberEncryptedName: internals.keyPair.encrypt(
        textToBytes(input.groupMemberName),
        groupValues.keyPair.publicKey,
        { padding: true },
      ),
    };
  } else {
    request.groupId = input.currentGroupId;

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

  request.pageEncryptedSymmetricKeyring = pageKeyring.wrapSymmetric(
    groupContentKeyring,
    {
      associatedData: {
        context: 'PageKeyring',
        pageId: request.pageId,
      },
    },
  ).wrappedValue;
  request.pageEncryptedRelativeTitle = pageKeyring.encrypt(
    textToBytes(input.pageRelativeTitle),
    {
      padding: true,
      associatedData: {
        context: 'PageRelativeTitle',
        pageId: request.pageId,
      },
    },
  );
  request.pageEncryptedAbsoluteTitle = pageKeyring.encrypt(textToBytes(''), {
    padding: true,
    associatedData: {
      context: 'PageAbsoluteTitle',
      pageId: request.pageId,
    },
  });

  return await trpcClient.pages.create.mutate(request);
}
