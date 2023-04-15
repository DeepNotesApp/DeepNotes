import { DataLayer } from '@stdlib/crypto';
import { groupAccessKeyrings } from 'src/code/pages/computed/group-access-keyrings';

export async function makeGroupPublic(groupId: string) {
  const accessKeyring = await groupAccessKeyrings()(groupId).getAsync();

  if (accessKeyring?.topLayer !== DataLayer.Raw) {
    throw new Error('Invalid group keyring.');
  }

  await trpcClient.groups.privacy.makePublic.mutate({
    groupId,

    accessKeyring: accessKeyring.wrappedValue,
  });
}
