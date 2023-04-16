import { base64ToBytes } from '@stdlib/base64';
import { wrapSymmetricKey } from '@stdlib/crypto';
import { Y } from '@syncedstore/core';
import { pageKeyrings } from 'src/code/pages/computed/page-keyrings';
import { revertToSnapshot } from 'src/code/pages/utils';

export async function restorePageSnapshot(input: {
  pageId: string;
  snapshotId: string;
  groupId: string;
  doc: Y.Doc;
}) {
  const pageKeyring = await pageKeyrings()(
    `${input.groupId}:${input.pageId}`,
  ).getAsync();

  if (pageKeyring == null) {
    throw new Error('Page keyring not found.');
  }

  const response = (
    await api().post<{
      encryptedSymmetricKey: string;
      encryptedData: string;
    }>(`/api/pages/${input.pageId}/snapshots/load/${input.snapshotId}`)
  ).data;

  // Encrypt pre-restore data

  const newSnapshotSymmetricKey = wrapSymmetricKey();

  const encryptedData = newSnapshotSymmetricKey.encrypt(
    Y.encodeStateAsUpdateV2(input.doc),
    {
      padding: true,
      associatedData: {
        context: 'PageSnapshotData',
        pageId: input.pageId,
      },
    },
  );

  // Restore snapshot

  const oldSnapshotSymmetricKey = wrapSymmetricKey(
    pageKeyring.decrypt(base64ToBytes(response.encryptedSymmetricKey), {
      associatedData: {
        context: 'PageSnapshotSymmetricKey',
        pageId: input.pageId,
      },
    }),
  );

  const snapshotData = oldSnapshotSymmetricKey.decrypt(
    base64ToBytes(response.encryptedData),
    {
      padding: true,
      associatedData: {
        context: 'PageSnapshotData',
        pageId: input.pageId,
      },
    },
  );

  revertToSnapshot(input.doc, snapshotData);

  // Save pre-restore data

  await trpcClient.pages.snapshots.save.mutate({
    pageId: input.pageId,

    encryptedSymmetricKey: pageKeyring.encrypt(newSnapshotSymmetricKey.value, {
      associatedData: {
        context: 'PageSnapshotSymmetricKey',
        pageId: input.pageId,
      },
    }),
    encryptedData,

    preRestore: true,
  });
}
