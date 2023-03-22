import { bytesToBase64 } from '@stdlib/base64';
import type { SymmetricKeyring } from '@stdlib/crypto';
import { DataLayer } from '@stdlib/crypto';
import { computeGroupPasswordValues } from 'src/code/crypto.client';
import { groupAccessKeyrings } from 'src/code/pages/computed/group-access-keyrings.client';
import { groupContentKeyrings } from 'src/code/pages/computed/group-content-keyrings.client';

export async function changeGroupPasswordProtection(
  groupId: string,
  {
    currentGroupPassword,
    newGroupPassword,
  }: { currentGroupPassword: string; newGroupPassword: string },
) {
  // Remove old password protection from group keyring

  let groupContentKeyring = await groupContentKeyrings()(groupId).getAsync();

  if (groupContentKeyring == null) {
    throw new Error('Group keyring not found.');
  }

  const currentGroupPasswordValues = await computeGroupPasswordValues(
    groupId,
    currentGroupPassword,
  );

  if (groupContentKeyring.topLayer === DataLayer.Symmetric) {
    groupContentKeyring = groupContentKeyring.unwrapSymmetric(
      currentGroupPasswordValues.passwordKey,
      {
        associatedData: {
          context: 'GroupContentKeyringPasswordProtection',
          groupId,
        },
      },
    ) as SymmetricKeyring;
  } else if (groupContentKeyring.topLayer !== DataLayer.Raw) {
    throw new Error('Group is not password protected.');
  }

  // Reprotect group keyring with new password

  const newGroupPasswordValues = await computeGroupPasswordValues(
    groupId,
    newGroupPassword,
  );

  groupContentKeyring = groupContentKeyring.wrapSymmetric(
    newGroupPasswordValues.passwordKey,
    {
      associatedData: {
        context: 'GroupContentKeyringPasswordProtection',
        groupId,
      },
    },
  ) as SymmetricKeyring;

  // Wrap content keyring with group keyring

  const accessKeyring = await groupAccessKeyrings()(groupId).getAsync();

  if (accessKeyring?.topLayer !== DataLayer.Raw) {
    throw new Error('Invalid group keyring.');
  }

  groupContentKeyring = groupContentKeyring.wrapSymmetric(accessKeyring, {
    associatedData: {
      context: 'GroupContentKeyring',
      groupId,
    },
  }) as SymmetricKeyring;

  // Send password change request

  await api().post(`api/groups/${groupId}/password/change`, {
    groupCurrentPasswordHash: bytesToBase64(
      currentGroupPasswordValues.passwordHash,
    ),
    groupNewPasswordHash: bytesToBase64(newGroupPasswordValues.passwordHash),

    groupEncryptedContentKeyring: bytesToBase64(groupContentKeyring.fullValue),
  });
}
