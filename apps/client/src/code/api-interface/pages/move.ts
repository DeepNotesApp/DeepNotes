import type {
  moveProcedureStep1,
  moveProcedureStep2,
} from '@deepnotes/app-server/src/websocket/pages/move';
import type { Keyring, SymmetricKeyring } from '@stdlib/crypto';
import { wrapSymmetricKey } from '@stdlib/crypto';
import { createSymmetricKeyring } from '@stdlib/crypto';
import { DataLayer } from '@stdlib/crypto';
import { objEntries, objFromEntries, textToBytes } from '@stdlib/misc';
import { Y } from '@syncedstore/core';
import { zxcvbn } from '@zxcvbn-ts/core';
import {
  generateGroupValues,
  unlockGroupContentKeyring,
} from 'src/code/crypto';
import { groupContentKeyrings } from 'src/code/pages/computed/group-content-keyrings';
import { pageKeyrings } from 'src/code/pages/computed/page-keyrings';
import { createPageDoc } from 'src/code/pages/utils';
import { asyncDialog } from 'src/code/utils/misc';
import { createWebsocketRequest } from 'src/code/utils/websocket-requests';

export async function movePage(input: {
  pageId: string;

  destGroupId: string;
  setAsMainPage: boolean;

  groupCreation?: {
    groupName: string;
    groupMemberName: string;
    groupIsPublic: boolean;
    groupPassword?: string;
  };
}) {
  const sourceGroupId = await internals.realtime.hget(
    'page',
    input.pageId,
    'group-id',
  );

  if (sourceGroupId === input.destGroupId && !input.setAsMainPage) {
    throw new Error('No changes were requested on page move.');
  }

  const { promise } = createWebsocketRequest({
    url: `${process.env.APP_SERVER_URL.replaceAll('http', 'ws')}/pages.move`,

    steps: [step1, step2, step3],
  });

  let destGroupContentKeyring: SymmetricKeyring | undefined;

  async function step1(): Promise<
    typeof moveProcedureStep1['_def']['_input_in']
  > {
    let destGroupId: string;

    let groupCreation: typeof moveProcedureStep1['_def']['_input_in']['groupCreation'];

    if (input.groupCreation != null) {
      if (input.groupCreation.groupName === '') {
        throw new Error('Please enter a group name.');
      }

      if (input.groupCreation.groupMemberName === '') {
        throw new Error('Please enter an user alias.');
      }

      if (
        input.groupCreation.groupPassword != null &&
        zxcvbn(input.groupCreation.groupPassword).score <= 2
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
        isPublic: input.groupCreation.groupIsPublic,
        password:
          input.groupCreation.groupPassword != null
            ? input.groupCreation.groupPassword
            : undefined,
      });

      destGroupId = groupValues.groupId;

      destGroupContentKeyring = groupValues.contentKeyring;

      const groupEncryptedName = groupValues.accessKeyring.encrypt(
        textToBytes(input.groupCreation.groupName),
        {
          padding: true,
          associatedData: {
            context: 'GroupName',
            groupId: groupValues.groupId,
          },
        },
      );

      const groupPasswordHash = groupValues.passwordValues?.passwordHash;

      const groupEncryptedInternalKeyring =
        groupValues.encryptedInternalKeyring.wrappedValue;
      const accessKeyring = groupValues.finalAccessKeyring.wrappedValue;
      const groupEncryptedContentKeyring =
        groupValues.encryptedContentKeyring.wrappedValue;

      const groupPublicKeyring = (groupValues.keyPair.publicKey as Keyring)
        .wrappedValue;
      const groupEncryptedPrivateKeyring =
        groupValues.encryptedPrivateKeyring.wrappedValue;

      const groupOwnerEncryptedName = internals.keyPair.encrypt(
        textToBytes(input.groupCreation.groupMemberName),
        groupValues.keyPair.publicKey,
        { padding: true },
      );

      groupCreation = {
        groupEncryptedName,
        groupPasswordHash,
        groupIsPublic: input.groupCreation.groupIsPublic,

        groupAccessKeyring: accessKeyring,
        groupEncryptedInternalKeyring,
        groupEncryptedContentKeyring,

        groupPublicKeyring,
        groupEncryptedPrivateKeyring,

        groupOwnerEncryptedName,
      };
    } else {
      destGroupId = input.destGroupId;

      destGroupContentKeyring = await groupContentKeyrings()(
        destGroupId,
      ).getAsync();

      if (destGroupContentKeyring?.topLayer === DataLayer.Symmetric) {
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

        destGroupContentKeyring = await unlockGroupContentKeyring(
          destGroupId,
          destGroupPassword,
        );
      }
    }

    if (destGroupContentKeyring?.topLayer !== DataLayer.Raw) {
      throw new Error('Invalid group content keyring.');
    }

    return {
      pageId: input.pageId,

      destGroupId: input.destGroupId,
      setAsMainPage: input.setAsMainPage,

      groupCreation,
    };
  }

  async function step2(
    input_: typeof moveProcedureStep1['_def']['_output_out'],
  ): Promise<typeof moveProcedureStep2['_def']['_input_in']> {
    const sourceGroupId = await internals.realtime.hget(
      'page',
      input.pageId,
      'group-id',
    );

    const oldPageKeyring = await pageKeyrings()(
      `${sourceGroupId}:${input.pageId}`,
    ).getAsync();

    if (oldPageKeyring?.topLayer !== DataLayer.Raw) {
      throw new Error('Invalid page keyring');
    }

    const newPageKeyring = createSymmetricKeyring();

    const pageEncryptedSymmetricKeyring = newPageKeyring.wrapSymmetric(
      destGroupContentKeyring!,
      {
        associatedData: {
          context: 'PageKeyring',
          pageId: input.pageId,
        },
      },
    ).wrappedValue;

    const pageEncryptedRelativeTitle = newPageKeyring.encrypt(
      oldPageKeyring.decrypt(input_.pageEncryptedRelativeTitle, {
        padding: true,
        associatedData: {
          context: 'PageRelativeTitle',
          pageId: input.pageId,
        },
      }),
      {
        padding: true,
        associatedData: {
          context: 'PageRelativeTitle',
          pageId: input.pageId,
        },
      },
    );

    const pageEncryptedAbsoluteTitle = newPageKeyring.encrypt(
      oldPageKeyring.decrypt(input_.pageEncryptedAbsoluteTitle, {
        padding: true,
        associatedData: {
          context: 'PageAbsoluteTitle',
          pageId: input.pageId,
        },
      }),
      {
        padding: true,
        associatedData: {
          context: 'PageAbsoluteTitle',
          pageId: input.pageId,
        },
      },
    );

    const auxDoc = createPageDoc();

    auxDoc.transact(() => {
      for (const pageEncryptedUpdate of input_.pageEncryptedUpdates) {
        try {
          Y.applyUpdateV2(
            auxDoc,
            oldPageKeyring.decrypt(pageEncryptedUpdate, {
              padding: true,
              associatedData: {
                context: 'PageDocUpdate',
                pageId: input.pageId,
              },
            }),
          );
        } catch (error) {
          mainLogger.error(error);
        }
      }
    });

    const pageEncryptedUpdate = newPageKeyring.encrypt(
      Y.encodeStateAsUpdateV2(auxDoc),
      {
        padding: true,
        associatedData: {
          context: 'PageDocUpdate',
          pageId: input.pageId,
        },
      },
    );

    const pageEncryptedSnapshots = objFromEntries(
      objEntries(input_.pageEncryptedSnapshots).map(
        ([snapshotId, { encryptedSymmetricKey, encryptedData }]) => {
          const oldSnapshotSymmetricKey = wrapSymmetricKey(
            oldPageKeyring.decrypt(encryptedSymmetricKey, {
              associatedData: {
                context: 'PageSnapshotSymmetricKey',
                pageId: input.pageId,
              },
            }),
          );
          const newSnapshotSymmetricKey = wrapSymmetricKey();

          return [
            snapshotId,
            {
              encryptedSymmetricKey: newPageKeyring.encrypt(
                newSnapshotSymmetricKey.value,
                {
                  associatedData: {
                    context: 'PageSnapshotSymmetricKey',
                    pageId: input.pageId,
                  },
                },
              ),
              encryptedData: newSnapshotSymmetricKey.encrypt(
                oldSnapshotSymmetricKey.decrypt(encryptedData, {
                  padding: true,
                  associatedData: {
                    context: 'PageSnapshotData',
                    pageId: input.pageId,
                  },
                }),
                {
                  padding: true,
                  associatedData: {
                    context: 'PageSnapshotData',
                    pageId: input.pageId,
                  },
                },
              ),
            },
          ];
        },
      ),
    );

    return {
      pageEncryptedSymmetricKeyring,
      pageEncryptedAbsoluteTitle,
      pageEncryptedRelativeTitle,

      pageEncryptedUpdate,
      pageEncryptedSnapshots,
    };
  }

  async function step3(
    _input: typeof moveProcedureStep2['_def']['_output_out'],
  ) {
    //
  }

  return promise;
}
