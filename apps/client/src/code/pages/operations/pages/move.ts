import {
  base64ToBytes,
  bytesToBase64,
  bytesToBase64Safe,
} from '@stdlib/base64';
import type { PublicKeyring, SymmetricKeyring } from '@stdlib/crypto';
import { createSymmetricKeyring } from '@stdlib/crypto';
import { wrapSymmetricKey } from '@stdlib/crypto';
import { DataLayer } from '@stdlib/crypto';
import { objEntries, objFromEntries, textToBytes } from '@stdlib/misc';
import { Y } from '@syncedstore/core';
import { zxcvbn } from '@zxcvbn-ts/core';
import {
  generateGroupValues,
  unlockGroupContentKeyring,
} from 'src/code/crypto.client';
import { groupContentKeyrings } from 'src/code/pages/computed/group-content-keyrings.client';
import { pageKeyrings } from 'src/code/pages/computed/page-keyrings.client';
import { createPageDoc } from 'src/code/pages/utils.client';
import { asyncPrompt } from 'src/code/utils.client';

export async function movePage(
  pageId: string,
  {
    currentGroupId,
    setAsMainPage,

    createGroup,
    groupName,
    groupMemberName,
    groupIsPublic,
    groupPassword,
  }: {
    currentGroupId: string;
    setAsMainPage: boolean;

    createGroup: boolean;
    groupName: string;
    groupMemberName: string;
    groupIsPublic: boolean;
    groupPassword?: string;
  },
) {
  const request = {} as {
    destGroupId: string;
    setAsMainPage: boolean;

    pageEncryptedSymmetricKeyring?: string;
    pageEncryptedRelativeTitle?: string;
    pageEncryptedAbsoluteTitle?: string;
    pageEncryptedUpdate?: string;
    pageEncryptedSnapshots?: Record<
      string,
      {
        encryptedSymmetricKey: string;
        encryptedData: string;
      }
    >;

    createGroup: boolean;
    groupEncryptedName?: string;
    groupPasswordHash?: string;
    groupIsPublic?: boolean;

    accessKeyring?: string;
    groupEncryptedInternalKeyring?: string;
    groupEncryptedContentKeyring?: string;

    groupPublicKeyring?: string;
    groupEncryptedPrivateKeyring?: string;

    groupMemberEncryptedName?: string;
  };

  request.setAsMainPage = setAsMainPage;
  request.createGroup = createGroup;

  if (createGroup) {
    let destGroupContentKeyring: SymmetricKeyring | undefined;

    if (request.createGroup) {
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

      request.destGroupId = groupValues.groupId;

      destGroupContentKeyring = groupValues.contentKeyring;

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

      request.groupEncryptedInternalKeyring = bytesToBase64(
        groupValues.encryptedInternalKeyring.fullValue,
      );
      request.accessKeyring = bytesToBase64(
        groupValues.finalAccessKeyring.fullValue,
      );
      request.groupEncryptedContentKeyring = bytesToBase64(
        groupValues.encryptedContentKeyring.fullValue,
      );

      request.groupPublicKeyring = bytesToBase64(
        (groupValues.keyPair.publicKey as PublicKeyring).fullValue,
      );
      request.groupEncryptedPrivateKeyring = bytesToBase64(
        groupValues.encryptedPrivateKeyring.fullValue,
      );

      request.groupMemberEncryptedName = bytesToBase64(
        internals.keyPair.encrypt(
          textToBytes(groupMemberName),
          groupValues.keyPair.publicKey,
          { padding: true },
        ),
      );
    } else {
      request.destGroupId = currentGroupId;

      destGroupContentKeyring = await groupContentKeyrings()(
        currentGroupId,
      ).getAsync();

      if (destGroupContentKeyring?.topLayer === DataLayer.Symmetric) {
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

        destGroupContentKeyring = await unlockGroupContentKeyring(
          currentGroupId,
          destGroupPassword,
        );
      }
    }

    if (destGroupContentKeyring?.topLayer !== DataLayer.Raw) {
      throw new Error('Invalid group content keyring.');
    }

    // Reencrypt page data

    const encryptedPageData = (
      await api().post<{
        pageEncryptedRelativeTitle: string;
        pageEncryptedAbsoluteTitle: string;
        pageEncryptedUpdates: string[];
        pageEncryptedSnapshots: Record<
          string,
          {
            encryptedSymmetricKey: string;
            encryptedData: string;
          }
        >;
      }>(`/api/pages/${pageId}/move`, request)
    ).data;

    const oldPageKeyring = await pageKeyrings()(
      `${currentGroupId}:${pageId}`,
    ).getAsync();

    if (oldPageKeyring?.topLayer !== DataLayer.Raw) {
      throw new Error('Invalid page keyring');
    }

    const newPageKeyring = createSymmetricKeyring();

    request.pageEncryptedSymmetricKeyring = bytesToBase64(
      newPageKeyring.wrapSymmetric(destGroupContentKeyring, {
        associatedData: {
          context: 'PageKeyring',
          pageId: pageId,
        },
      }).fullValue,
    );

    request.pageEncryptedRelativeTitle = bytesToBase64(
      newPageKeyring.encrypt(
        oldPageKeyring.decrypt(
          base64ToBytes(encryptedPageData.pageEncryptedRelativeTitle),
          {
            padding: true,
            associatedData: {
              context: 'PageRelativeTitle',
              pageId: pageId,
            },
          },
        ),
        {
          padding: true,
          associatedData: {
            context: 'PageRelativeTitle',
            pageId: pageId,
          },
        },
      ),
    );

    request.pageEncryptedAbsoluteTitle = bytesToBase64(
      newPageKeyring.encrypt(
        oldPageKeyring.decrypt(
          base64ToBytes(encryptedPageData.pageEncryptedAbsoluteTitle),
          {
            padding: true,
            associatedData: {
              context: 'PageAbsoluteTitle',
              pageId: pageId,
            },
          },
        ),
        {
          padding: true,
          associatedData: {
            context: 'PageAbsoluteTitle',
            pageId: pageId,
          },
        },
      ),
    );

    const auxDoc = createPageDoc();

    auxDoc.transact(() => {
      for (const pageEncryptedUpdate of encryptedPageData.pageEncryptedUpdates) {
        try {
          Y.applyUpdateV2(
            auxDoc,
            oldPageKeyring.decrypt(base64ToBytes(pageEncryptedUpdate), {
              padding: true,
              associatedData: {
                context: 'PageDocUpdate',
                pageId: pageId,
              },
            }),
          );
        } catch (error) {
          mainLogger().error(error);
        }
      }
    });

    request.pageEncryptedUpdate = bytesToBase64(
      newPageKeyring.encrypt(Y.encodeStateAsUpdateV2(auxDoc), {
        padding: true,
        associatedData: {
          context: 'PageDocUpdate',
          pageId: pageId,
        },
      }),
    );

    request.pageEncryptedSnapshots = objFromEntries(
      objEntries(encryptedPageData.pageEncryptedSnapshots).map(
        ([snapshotId, { encryptedSymmetricKey, encryptedData }]) => {
          const oldSnapshotSymmetricKey = wrapSymmetricKey(
            oldPageKeyring.decrypt(base64ToBytes(encryptedSymmetricKey), {
              associatedData: {
                context: 'PageSnapshotSymmetricKey',
                pageId: pageId,
              },
            }),
          );
          const newSnapshotSymmetricKey = wrapSymmetricKey();

          return [
            snapshotId,
            {
              encryptedSymmetricKey: bytesToBase64(
                newPageKeyring.encrypt(newSnapshotSymmetricKey.value, {
                  associatedData: {
                    context: 'PageSnapshotSymmetricKey',
                    pageId: pageId,
                  },
                }),
              ),
              encryptedData: bytesToBase64(
                newSnapshotSymmetricKey.encrypt(
                  oldSnapshotSymmetricKey.decrypt(
                    base64ToBytes(encryptedData),
                    {
                      padding: true,
                      associatedData: {
                        context: 'PageSnapshotData',
                        pageId: pageId,
                      },
                    },
                  ),
                  {
                    padding: true,
                    associatedData: {
                      context: 'PageSnapshotData',
                      pageId: pageId,
                    },
                  },
                ),
              ),
            },
          ];
        },
      ),
    );
  }

  await api().post(`/api/pages/${pageId}/move`, request);
}
