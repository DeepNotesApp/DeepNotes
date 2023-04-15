import { DataLayer } from '@stdlib/crypto';
import { computeGroupPasswordValues } from 'src/code/crypto';
import { groupAccessKeyrings } from 'src/code/pages/computed/group-access-keyrings';
import { groupContentKeyrings } from 'src/code/pages/computed/group-content-keyrings';

export async function enableGroupPasswordProtection(input: {
  groupId: string;
  groupPassword: string;
}) {
  // Get group content keyring

  let groupContentKeyring = await groupContentKeyrings()(
    input.groupId,
  ).getAsync();

  if (groupContentKeyring == null) {
    throw new Error('Group keyring not found.');
  }

  if (groupContentKeyring.topLayer !== DataLayer.Raw) {
    throw new Error('Invalid group content keyring.');
  }

  // Password protect group keyring

  const groupPasswordValues = await computeGroupPasswordValues(
    input.groupId,
    input.groupPassword,
  );

  groupContentKeyring = groupContentKeyring.wrapSymmetric(
    groupPasswordValues.passwordKey,
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

  // Send password enable request

  await trpcClient.groups.password.enable.mutate({
    groupId: input.groupId,

    groupPasswordHash: groupPasswordValues.passwordHash,

    groupEncryptedContentKeyring: groupContentKeyring.wrappedValue,
  });
}
