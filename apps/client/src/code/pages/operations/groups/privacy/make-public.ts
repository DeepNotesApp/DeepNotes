import { bytesToBase64 } from '@stdlib/base64';
import { DataLayer } from '@stdlib/crypto';
import { groupAccessKeyrings } from 'src/code/pages/computed/group-access-keyrings.client';

export async function makeGroupPublic(groupId: string) {
  const accessKeyring = await groupAccessKeyrings()(groupId).getAsync();

  if (accessKeyring?.topLayer !== DataLayer.Raw) {
    throw new Error('Invalid group keyring.');
  }

  await api().post(`/api/groups/${groupId}/privacy/make-public`, {
    accessKeyring: bytesToBase64(accessKeyring.fullValue),
  });
}
