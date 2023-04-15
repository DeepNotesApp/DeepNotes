import { DataLayer } from '@stdlib/crypto';
import { computeGroupPasswordValues } from 'src/code/crypto';
import { groupAccessKeyrings } from 'src/code/pages/computed/group-access-keyrings';
import { groupContentKeyrings } from 'src/code/pages/computed/group-content-keyrings';
import { trpcClient } from 'src/code/trpc';

export async function changeGroupPasswordProtection(input: {
  groupId: string;
  currentGroupPassword: string;
  newGroupPassword: string;
}) {
  // Remove old password protection from group keyring

  let groupContentKeyring = await groupContentKeyrings()(
    input.groupId,
  ).getAsync();

  if (groupContentKeyring == null) {
    throw new Error('Group keyring not found.');
  }

  const currentGroupPasswordValues = await computeGroupPasswordValues(
    input.groupId,
    input.currentGroupPassword,
  );

  if (groupContentKeyring.topLayer === DataLayer.Symmetric) {
    groupContentKeyring = groupContentKeyring.unwrapSymmetric(
      currentGroupPasswordValues.passwordKey,
      {
        associatedData: {
          context: 'GroupContentKeyringPasswordProtection',
          groupId: input.groupId,
        },
      },
    );
  } else if (groupContentKeyring.topLayer !== DataLayer.Raw) {
    throw new Error('Group is not password protected.');
  }

  // Reprotect group keyring with new password

  const newGroupPasswordValues = await computeGroupPasswordValues(
    input.groupId,
    input.newGroupPassword,
  );

  groupContentKeyring = groupContentKeyring.wrapSymmetric(
    newGroupPasswordValues.passwordKey,
    {
      associatedData: {
        context: 'GroupContentKeyringPasswordProtection',
        groupId: input.groupId,
      },
    },
  );

  // Wrap content keyring with group keyring

  const accessKeyring = await groupAccessKeyrings()(input.groupId).getAsync();

  if (accessKeyring?.topLayer !== DataLayer.Raw) {
    throw new Error('Invalid group keyring.');
  }

  groupContentKeyring = groupContentKeyring.wrapSymmetric(accessKeyring, {
    associatedData: {
      context: 'GroupContentKeyring',
      groupId: input.groupId,
    },
  });

  // Send password change request

  await trpcClient.groups.password.change.mutate({
    groupId: input.groupId,

    groupCurrentPasswordHash: currentGroupPasswordValues.passwordHash,
    groupNewPasswordHash: newGroupPasswordValues.passwordHash,

    groupEncryptedContentKeyring: groupContentKeyring.wrappedValue,
  });
}
