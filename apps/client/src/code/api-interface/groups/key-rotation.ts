import type {
  rotateKeysProcedureStep1,
  rotateKeysProcedureStep2,
} from '@deepnotes/app-server/src/websocket/groups/rotate-keys';
import {
  createKeyring,
  createPrivateKeyring,
  createSymmetricKeyring,
  DataLayer,
} from '@stdlib/crypto';
import { objEntries, objFromEntries } from '@stdlib/misc';
import sodium from 'libsodium-wrappers';
import { computeGroupPasswordValues } from 'src/code/crypto';
import { asyncDialog } from 'src/code/utils/misc';
import { createWebsocketRequest } from 'src/code/utils/websocket-requests';

export async function rotateGroupKeys(input: { groupId: string }) {
  const { promise } = createWebsocketRequest({
    url: `${process.env.APP_SERVER_URL.replaceAll(
      'http',
      'ws',
    )}/groups.rotateKeys`,

    steps: [step1, step2, step3],
  });

  async function step1(): Promise<
    (typeof rotateKeysProcedureStep1)['_def']['_input_in']
  > {
    return {
      groupId: input.groupId,
    };
  }

  async function step2(
    input_: (typeof rotateKeysProcedureStep1)['_def']['_output_out'],
  ): Promise<(typeof rotateKeysProcedureStep2)['_def']['_input_in']> {
    return await processGroupKeyRotationValues({
      ...input_,

      groupId: input.groupId,
    });
  }

  async function step3(
    _input: (typeof rotateKeysProcedureStep2)['_def']['_output_out'],
  ) {
    //
  }

  return promise;
}

export async function processGroupKeyRotationValues(
  input: (typeof rotateKeysProcedureStep1)['_def']['_output_out'] & {
    groupId: string;

    groupIsPublic?: boolean;
  },
): Promise<(typeof rotateKeysProcedureStep2)['_def']['_input_in']> {
  input.groupIsPublic ??= input.groupAccessKeyring != null;

  const oldGroupAccessKeyring =
    input.groupAccessKeyring != null
      ? createSymmetricKeyring(input.groupAccessKeyring)
      : createSymmetricKeyring(
          input.groupEncryptedAccessKeyring!,
        ).unwrapAsymmetric(internals.keyPair.privateKey);
  const oldGroupInternalKeyring = createSymmetricKeyring(
    input.groupEncryptedInternalKeyring,
  ).unwrapAsymmetric(internals.keyPair.privateKey);

  const oldGroupPublicKeyring = createKeyring(input.groupPublicKeyring);
  const oldGroupPrivateKeyring = createPrivateKeyring(
    input.groupEncryptedPrivateKeyring,
  ).unwrapSymmetric(oldGroupInternalKeyring, {
    associatedData: {
      context: 'GroupPrivateKeyring',
      groupId: input.groupId,
    },
  });

  let oldGroupContentKeyring = createSymmetricKeyring(
    input.groupEncryptedContentKeyring,
  ).unwrapSymmetric(oldGroupAccessKeyring, {
    associatedData: {
      context: 'GroupContentKeyring',
      groupId: input.groupId,
    },
  });

  let groupPasswordValues: Awaited<
    ReturnType<typeof computeGroupPasswordValues>
  >;

  const passwordProtected = oldGroupContentKeyring.hasLayer(
    DataLayer.Symmetric,
  );

  if (passwordProtected) {
    const groupPassword = await asyncDialog<string>({
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
      input.groupId,
      groupPassword,
    );

    try {
      oldGroupContentKeyring = oldGroupContentKeyring.unwrapSymmetric(
        groupPasswordValues.passwordKey,
        {
          associatedData: {
            context: 'GroupContentKeyringPasswordProtection',
            groupId: input.groupId,
          },
        },
      );
    } catch (error) {
      throw new Error('Incorrect group password.');
    }
  }

  const newGroupAccessKeyring = oldGroupAccessKeyring.addKey();
  const newGroupInternalKeyring = oldGroupInternalKeyring.addKey();
  const newGroupContentKeyring = oldGroupContentKeyring.addKey();

  const newGroupRawKeypair = sodium.crypto_box_keypair();
  const newGroupPublicKeyring = oldGroupPublicKeyring.addKey(
    newGroupRawKeypair.publicKey,
  );
  const newGroupPrivateKeyring = oldGroupPrivateKeyring.addKey(
    newGroupRawKeypair.privateKey,
  );

  return {
    ...(input.groupIsPublic
      ? {
          groupAccessKeyring: newGroupAccessKeyring.wrappedValue,
        }
      : {}),
    groupEncryptedName:
      input.groupEncryptedName.length === 0
        ? new Uint8Array() // Personal group name is empty
        : newGroupAccessKeyring.encrypt(
            oldGroupAccessKeyring.decrypt(input.groupEncryptedName, {
              padding: true,
              associatedData: {
                context: 'GroupName',
                groupId: input.groupId,
              },
            }),
            {
              padding: true,
              associatedData: {
                context: 'GroupName',
                groupId: input.groupId,
              },
            },
          ),
    groupEncryptedContentKeyring: (passwordProtected
      ? newGroupContentKeyring.wrapSymmetric(groupPasswordValues!.passwordKey, {
          associatedData: {
            context: 'GroupContentKeyringPasswordProtection',
            groupId: input.groupId,
          },
        })
      : newGroupContentKeyring
    ).wrapSymmetric(newGroupAccessKeyring, {
      associatedData: {
        context: 'GroupContentKeyring',
        groupId: input.groupId,
      },
    }).wrappedValue,
    groupPublicKeyring: newGroupPublicKeyring.wrappedValue,
    groupEncryptedPrivateKeyring: newGroupPrivateKeyring.wrapSymmetric(
      newGroupInternalKeyring,
      {
        associatedData: {
          context: 'GroupPrivateKeyring',
          groupId: input.groupId,
        },
      },
    ).wrappedValue,

    groupMembers: objFromEntries(
      objEntries(input.groupMembers).map(([userId, groupMember]) => [
        userId,
        {
          ...(!input.groupIsPublic
            ? {
                encryptedAccessKeyring: newGroupAccessKeyring.wrapAsymmetric(
                  internals.keyPair,
                  createKeyring(groupMember.publicKeyring),
                ).wrappedValue,
              }
            : {}),
          encryptedInternalKeyring: newGroupInternalKeyring.wrapAsymmetric(
            internals.keyPair,
            createKeyring(groupMember.publicKeyring),
          ).wrappedValue,

          encryptedName:
            groupMember.encryptedName == null
              ? null
              : newGroupPrivateKeyring.encrypt(
                  oldGroupPrivateKeyring.decrypt(groupMember.encryptedName, {
                    padding: true,
                  }),
                  newGroupPublicKeyring,
                  newGroupPublicKeyring,
                  { padding: true },
                ),
        },
      ]),
    ),
    groupJoinInvitations: objFromEntries(
      objEntries(input.groupJoinInvitations).map(
        ([userId, groupJoinInvitation]) => [
          userId,
          {
            ...(!input.groupIsPublic
              ? {
                  encryptedAccessKeyring: newGroupAccessKeyring.wrapAsymmetric(
                    internals.keyPair,
                    createKeyring(groupJoinInvitation.publicKeyring),
                  ).wrappedValue,
                }
              : {}),
            encryptedInternalKeyring: newGroupInternalKeyring.wrapAsymmetric(
              internals.keyPair,
              createKeyring(groupJoinInvitation.publicKeyring),
            ).wrappedValue,

            encryptedName: newGroupPrivateKeyring.encrypt(
              oldGroupPrivateKeyring.decrypt(
                groupJoinInvitation.encryptedName,
                { padding: true },
              ),
              newGroupPublicKeyring,
              newGroupPublicKeyring,
              { padding: true },
            ),
          },
        ],
      ),
    ),
    groupJoinRequests: objFromEntries(
      objEntries(input.groupJoinRequests).map(([userId, groupJoinRequest]) => [
        userId,
        {
          encryptedName: newGroupPrivateKeyring.encrypt(
            oldGroupPrivateKeyring.decrypt(groupJoinRequest.encryptedName, {
              padding: true,
            }),
            newGroupPublicKeyring,
            newGroupPublicKeyring,
            { padding: true },
          ),
        },
      ]),
    ),

    groupPages: objFromEntries(
      objEntries(input.groupPages).map(([pageId, groupPage]) => [
        pageId,
        {
          encryptedSymmetricKeyring: createSymmetricKeyring(
            groupPage.encryptedSymmetricKeyring,
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
            }).wrappedValue,
        },
      ]),
    ),
  };
}
