import { base64ToBytes, bytesToBase64 } from '@stdlib/base64';
import type { SymmetricKeyring } from '@stdlib/crypto';
import { createPrivateKeyring, createPublicKeyring } from '@stdlib/crypto';
import { createSymmetricKeyring, DataLayer } from '@stdlib/crypto';
import { objEntries, objFromEntries } from '@stdlib/misc';
import sodium from 'libsodium-wrappers';

import { computeGroupPasswordValues } from '../../../crypto';
import { asyncPrompt } from '../../../utils';

export type GroupKeyRotationValues = {
  groupAccessKeyring?: string;
  groupEncryptedName: string;
  groupEncryptedContentKeyring: string;
  groupPublicKeyring: string;
  groupEncryptedPrivateKeyring: string;

  groupEncryptedAccessKeyring?: string;
  groupEncryptedInternalKeyring: string;

  groupMembers: Record<
    string,
    {
      publicKeyring: string;

      encryptedName: string;
    }
  >;
  groupJoinInvitations: Record<
    string,
    {
      publicKeyring: string;

      encryptedName: string;
    }
  >;
  groupJoinRequests: Record<
    string,
    {
      encryptedName: string;
    }
  >;

  groupPages: Record<
    string,
    {
      encryptedSymmetricKeyring: string;
    }
  >;
};

export async function processGroupKeyRotationValues(
  groupId: string,
  params: GroupKeyRotationValues & { groupIsPublic?: boolean },
) {
  params.groupIsPublic ??= params.groupAccessKeyring != null;

  const oldGroupAccessKeyring: SymmetricKeyring =
    params.groupAccessKeyring != null
      ? createSymmetricKeyring(base64ToBytes(params.groupAccessKeyring))
      : createSymmetricKeyring(
          base64ToBytes(params.groupEncryptedAccessKeyring!),
        ).unwrapAsymmetric(internals.keyPair.privateKey);
  const oldGroupInternalKeyring: SymmetricKeyring = createSymmetricKeyring(
    base64ToBytes(params.groupEncryptedInternalKeyring),
  ).unwrapAsymmetric(internals.keyPair.privateKey);

  const oldGroupPublicKeyring = createPublicKeyring(
    base64ToBytes(params.groupPublicKeyring),
  );
  const oldGroupPrivateKeyring = createPrivateKeyring(
    base64ToBytes(params.groupEncryptedPrivateKeyring),
  ).unwrapSymmetric(oldGroupInternalKeyring, {
    associatedData: {
      context: 'GroupPrivateKeyring',
      groupId,
    },
  });

  let oldGroupContentKeyring: SymmetricKeyring = createSymmetricKeyring(
    base64ToBytes(params.groupEncryptedContentKeyring),
  ).unwrapSymmetric(oldGroupAccessKeyring, {
    associatedData: {
      context: 'GroupContentKeyring',
      groupId,
    },
  });

  let groupPasswordValues: Awaited<
    ReturnType<typeof computeGroupPasswordValues>
  >;

  const passwordProtected = oldGroupContentKeyring.hasLayer(
    DataLayer.Symmetric,
  );

  if (passwordProtected) {
    const groupPassword = await asyncPrompt<string>({
      title: 'Password protection',
      message: 'Enter the group password:',
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

    groupPasswordValues = await computeGroupPasswordValues(
      groupId,
      groupPassword,
    );

    try {
      oldGroupContentKeyring = oldGroupContentKeyring.unwrapSymmetric(
        groupPasswordValues.passwordKey,
        {
          associatedData: {
            context: 'GroupContentKeyringPasswordProtection',
            groupId,
          },
        },
      );
    } catch (error) {
      throw new Error('Incorrect group password.');
    }
  }

  const newGroupAccessKeyring: SymmetricKeyring =
    oldGroupAccessKeyring.addKey();
  const newGroupInternalKeyring: SymmetricKeyring =
    oldGroupInternalKeyring.addKey();
  const newGroupContentKeyring: SymmetricKeyring =
    oldGroupContentKeyring.addKey();

  const newGroupRawKeypair = sodium.crypto_box_keypair();
  const newGroupPublicKeyring = oldGroupPublicKeyring.addKey(
    newGroupRawKeypair.publicKey,
  );
  const newGroupPrivateKeyring = oldGroupPrivateKeyring.addKey(
    newGroupRawKeypair.privateKey,
  );

  return {
    ...(params.groupIsPublic
      ? { groupAccessKeyring: bytesToBase64(newGroupAccessKeyring.fullValue) }
      : {}),
    groupEncryptedName: bytesToBase64(
      newGroupAccessKeyring.encrypt(
        oldGroupAccessKeyring.decrypt(
          base64ToBytes(params.groupEncryptedName),
          {
            padding: true,
            associatedData: {
              context: 'GroupName',
              groupId,
            },
          },
        ),
        {
          padding: true,
          associatedData: {
            context: 'GroupName',
            groupId,
          },
        },
      ),
    ),
    groupEncryptedContentKeyring: bytesToBase64(
      (passwordProtected
        ? newGroupContentKeyring.wrapSymmetric(
            groupPasswordValues!.passwordKey,
            {
              associatedData: {
                context: 'GroupContentKeyringPasswordProtection',
                groupId,
              },
            },
          )
        : newGroupContentKeyring
      ).wrapSymmetric(newGroupAccessKeyring, {
        associatedData: {
          context: 'GroupContentKeyring',
          groupId,
        },
      }).fullValue,
    ),
    groupPublicKeyring: bytesToBase64(newGroupPublicKeyring.fullValue),
    groupEncryptedPrivateKeyring: bytesToBase64(
      newGroupPrivateKeyring.wrapSymmetric(newGroupInternalKeyring, {
        associatedData: {
          context: 'GroupPrivateKeyring',
          groupId,
        },
      }).fullValue,
    ),

    groupMembers: objFromEntries(
      objEntries(params.groupMembers).map(([userId, groupMember]) => [
        userId,
        {
          ...(!params.groupIsPublic
            ? {
                encryptedAccessKeyring: bytesToBase64(
                  newGroupAccessKeyring.wrapAsymmetric(
                    internals.keyPair,
                    createPublicKeyring(
                      base64ToBytes(groupMember.publicKeyring),
                    ),
                  ).fullValue,
                ),
              }
            : {}),
          encryptedInternalKeyring: bytesToBase64(
            newGroupInternalKeyring.wrapAsymmetric(
              internals.keyPair,
              createPublicKeyring(base64ToBytes(groupMember.publicKeyring)),
            ).fullValue,
          ),

          encryptedName: bytesToBase64(
            newGroupPrivateKeyring.encrypt(
              oldGroupPrivateKeyring.decrypt(
                base64ToBytes(groupMember.encryptedName),
                { padding: true },
              ),
              newGroupPublicKeyring,
              newGroupPublicKeyring,
              { padding: true },
            ),
          ),
        },
      ]),
    ),
    groupJoinInvitations: objFromEntries(
      objEntries(params.groupJoinInvitations).map(
        ([userId, groupJoinInvitation]) => [
          userId,
          {
            ...(!params.groupIsPublic
              ? {
                  encryptedAccessKeyring: bytesToBase64(
                    newGroupAccessKeyring.wrapAsymmetric(
                      internals.keyPair,
                      createPublicKeyring(
                        base64ToBytes(groupJoinInvitation.publicKeyring),
                      ),
                    ).fullValue,
                  ),
                }
              : {}),
            encryptedInternalKeyring: bytesToBase64(
              newGroupInternalKeyring.wrapAsymmetric(
                internals.keyPair,
                createPublicKeyring(
                  base64ToBytes(groupJoinInvitation.publicKeyring),
                ),
              ).fullValue,
            ),

            encryptedName: bytesToBase64(
              newGroupPrivateKeyring.encrypt(
                oldGroupPrivateKeyring.decrypt(
                  base64ToBytes(groupJoinInvitation.encryptedName),
                  { padding: true },
                ),
                newGroupPublicKeyring,
                newGroupPublicKeyring,
                { padding: true },
              ),
            ),
          },
        ],
      ),
    ),
    groupJoinRequests: objFromEntries(
      objEntries(params.groupJoinRequests).map(([userId, groupJoinRequest]) => [
        userId,
        {
          encryptedName: bytesToBase64(
            newGroupPrivateKeyring.encrypt(
              oldGroupPrivateKeyring.decrypt(
                base64ToBytes(groupJoinRequest.encryptedName),
                { padding: true },
              ),
              newGroupPublicKeyring,
              newGroupPublicKeyring,
              { padding: true },
            ),
          ),
        },
      ]),
    ),

    groupPages: objFromEntries(
      objEntries(params.groupPages).map(([pageId, groupPage]) => [
        pageId,
        {
          encryptedSymmetricKeyring: bytesToBase64(
            createSymmetricKeyring(
              base64ToBytes(groupPage.encryptedSymmetricKeyring),
            )
              .unwrapSymmetric(oldGroupContentKeyring, {
                associatedData: {
                  context: 'PageKeyring',
                  pageId,
                },
              })
              .wrapSymmetric(newGroupContentKeyring, {
                associatedData: {
                  context: 'PageKeyring',
                  pageId,
                },
              }).fullValue,
          ),
        },
      ]),
    ),
  };
}

export async function rotateGroupKeys(groupId: string) {
  const groupKeyRotationValues = (
    await api().post<GroupKeyRotationValues>(
      `/api/groups/${groupId}/rotate-keys`,
      {},
    )
  ).data;

  await api().post(
    `/api/groups/${groupId}/rotate-keys`,
    await processGroupKeyRotationValues(groupId, groupKeyRotationValues),
  );
}
