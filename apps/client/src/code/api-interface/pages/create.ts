import { bytesToBase64, bytesToBase64Safe } from '@stdlib/base64';
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
import { asyncPrompt } from 'src/code/utils';

export async function createPage(
  pageId: string,
  {
    currentGroupId,
    pageRelativeTitle,

    createGroup,
    groupName,
    groupMemberName,
    groupIsPublic,
    groupPassword,
  }: {
    currentGroupId: string;
    pageRelativeTitle: string;

    createGroup: boolean;
    groupName: string;
    groupMemberName: string;
    groupIsPublic: boolean;
    groupPassword?: string;
  },
) {
  let groupContentKeyring: SymmetricKeyring | undefined;

  const request = {} as {
    parentPageId: string;
    groupId: string;
    pageId: string;

    pageEncryptedSymmetricKeyring: string;
    pageEncryptedRelativeTitle: string;
    pageEncryptedAbsoluteTitle: string;

    createGroup: boolean;
    groupEncryptedName: string;
    groupPasswordHash?: string;
    groupIsPublic: boolean;
    accessKeyring: string;
    groupEncryptedInternalKeyring: string;
    groupEncryptedContentKeyring: string;
    groupPublicKeyring: string;
    groupEncryptedPrivateKeyring: string;
    groupMemberEncryptedName: string;
  };

  request.parentPageId = pageId;

  request.pageId = nanoid();

  request.createGroup = createGroup;

  if (createGroup) {
    if (groupName === '') {
      throw new Error('Please enter a group name.');
    }

    if (groupMemberName === '') {
      throw new Error('Please enter an user alias.');
    }

    if (groupPassword != null && zxcvbn(groupPassword).score <= 2) {
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
      isPublic: groupIsPublic,
      password: groupPassword != null ? groupPassword : undefined,
    });

    request.groupId = groupValues.groupId;

    groupContentKeyring = groupValues.contentKeyring;

    request.groupEncryptedName = bytesToBase64(
      groupValues.accessKeyring.encrypt(textToBytes(groupName), {
        padding: true,
        associatedData: {
          context: 'GroupName',
          groupId: groupValues.groupId,
        },
      }),
    );

    request.groupPasswordHash = bytesToBase64Safe(
      groupValues.passwordValues?.passwordHash,
    );

    request.groupIsPublic = groupIsPublic;

    request.accessKeyring = bytesToBase64(
      groupValues.finalAccessKeyring.wrappedValue,
    );
    request.groupEncryptedInternalKeyring = bytesToBase64(
      groupValues.encryptedInternalKeyring.wrappedValue,
    );
    request.groupEncryptedContentKeyring = bytesToBase64(
      groupValues.encryptedContentKeyring.wrappedValue,
    );

    request.groupPublicKeyring = bytesToBase64(
      (groupValues.keyPair.publicKey as Keyring).wrappedValue,
    );
    request.groupEncryptedPrivateKeyring = bytesToBase64(
      groupValues.encryptedPrivateKeyring.wrappedValue,
    );

    request.groupMemberEncryptedName = bytesToBase64(
      internals.keyPair.encrypt(
        textToBytes(groupMemberName),
        groupValues.keyPair.publicKey,
        { padding: true },
      ),
    );
  } else {
    request.groupId = currentGroupId;

    groupContentKeyring = await groupContentKeyrings()(
      currentGroupId,
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
        currentGroupId,
        destGroupPassword,
      );
    }
  }

  if (groupContentKeyring?.topLayer !== DataLayer.Raw) {
    throw new Error('Invalid group content keyring.');
  }

  const pageKeyring = createSymmetricKeyring();

  request.pageEncryptedSymmetricKeyring = bytesToBase64(
    pageKeyring.wrapSymmetric(groupContentKeyring, {
      associatedData: {
        context: 'PageKeyring',
        pageId: request.pageId,
      },
    }).wrappedValue,
  );
  request.pageEncryptedRelativeTitle = bytesToBase64(
    pageKeyring.encrypt(textToBytes(pageRelativeTitle), {
      padding: true,
      associatedData: {
        context: 'PageRelativeTitle',
        pageId: request.pageId,
      },
    }),
  );
  request.pageEncryptedAbsoluteTitle = bytesToBase64(
    pageKeyring.encrypt(textToBytes(''), {
      padding: true,
      associatedData: {
        context: 'PageAbsoluteTitle',
        pageId: request.pageId,
      },
    }),
  );

  return (
    await api().post<{
      pageId: string;
      message?: string;
    }>('/api/pages/create', request)
  ).data;
}
