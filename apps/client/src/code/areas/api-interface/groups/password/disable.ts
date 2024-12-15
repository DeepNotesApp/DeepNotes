import { DataLayer } from '@stdlib/crypto';
import { computeGroupPasswordValues } from 'src/code/crypto';
import { groupAccessKeyrings } from 'src/code/pages/computed/group-access-keyrings';
import { groupContentKeyrings } from 'src/code/pages/computed/group-content-keyrings';

export async function disableGroupPasswordProtection(input: {
  groupId: string;
  groupPassword: string;
}) {
  // Get password protected group keyring

  let groupContentKeyring = await groupContentKeyrings()(
    input.groupId,
  ).getAsync();

  if (groupContentKeyring == null) {
    throw new Error('Group keyring not found.');
  }

  // Get group password values

  const groupPasswordValues = await computeGroupPasswordValues(
    input.groupId,
    input.groupPassword,
  );

  // Remove password protection from group keyring

  if (groupContentKeyring.topLayer === DataLayer.Symmetric) {
    groupContentKeyring = groupContentKeyring.unwrapSymmetric(
      groupPasswordValues.passwordKey,
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

  // Send password disable request

  await trpcClient.groups.password.disable.mutate({
    groupId: input.groupId,

    groupPasswordHash: groupPasswordValues.passwordHash,

    groupEncryptedContentKeyring: groupContentKeyring.wrappedValue,
  });
}
