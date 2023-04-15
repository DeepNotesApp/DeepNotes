import { bytesToBase64 } from '@stdlib/base64';
import { wrapSymmetricKey } from '@stdlib/crypto';
import { Y } from '@syncedstore/core';
import { pageKeyrings } from 'src/code/pages/computed/page-keyrings';

export async function savePageSnapshot(input: {
  pageId: string;
  groupId: string;
  doc: Y.Doc;
}) {
  const pageKeyring = pageKeyrings()(`${input.groupId}:${input.pageId}`).get();

  if (pageKeyring == null) {
    throw new Error('Page keyring not found.');
  }

  const symmetricKey = wrapSymmetricKey();

  await api().post(`/api/pages/${input.pageId}/snapshots/save`, {
    encryptedSymmetricKey: bytesToBase64(
      pageKeyring.encrypt(symmetricKey.value, {
        associatedData: {
          context: 'PageSnapshotSymmetricKey',
          pageId: input.pageId,
        },
      }),
    ),
    encryptedData: bytesToBase64(
      symmetricKey.encrypt(Y.encodeStateAsUpdateV2(input.doc), {
        padding: true,
        associatedData: {
          context: 'PageDocUpdate',
          pageId: input.pageId,
        },
      }),
    ),
  });
}
