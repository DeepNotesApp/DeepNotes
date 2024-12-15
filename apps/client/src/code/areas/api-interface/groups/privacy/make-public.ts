import { DataLayer } from '@stdlib/crypto';
import { groupAccessKeyrings } from 'src/code/pages/computed/group-access-keyrings';

export async function makeGroupPublic(input: { groupId: string }) {
  const accessKeyring = await groupAccessKeyrings()(input.groupId).getAsync();

  if (accessKeyring?.topLayer !== DataLayer.Raw) {
    throw new Error('Invalid group keyring.');
  }

  await trpcClient.groups.privacy.makePublic.mutate({
    groupId: input.groupId,

    accessKeyring: accessKeyring.wrappedValue,
  });
}
