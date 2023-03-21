import { bytesToBase64 } from '@stdlib/base64';
import { wrapSymmetricKey } from '@stdlib/crypto';
import { Y } from '@syncedstore/core';
import { pageKeyrings } from 'src/code/pages/computed/page-keyrings.client';

export async function savePageSnapshot(
  pageId: string,
  { groupId, doc }: { groupId: string; doc: Y.Doc },
) {
  const pageKeyring = pageKeyrings()(`${groupId}:${pageId}`).get();

  if (pageKeyring == null) {
    throw new Error('Page keyring not found.');
  }

  const symmetricKey = wrapSymmetricKey();

  await api().post(`/api/pages/${pageId}/snapshots/save`, {
    encryptedSymmetricKey: bytesToBase64(
      pageKeyring.encrypt(symmetricKey.value, {
        associatedData: {
          context: 'PageSnapshotSymmetricKey',
          pageId: pageId,
        },
      }),
    ),
    encryptedData: bytesToBase64(
      symmetricKey.encrypt(Y.encodeStateAsUpdateV2(doc), {
        padding: true,
        associatedData: {
          context: 'PageDocUpdate',
          pageId: pageId,
        },
      }),
    ),
  });
}
