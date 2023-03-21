export async function deletePageSnapshot(pageId: string, snapshotId: string) {
  await api().post(`/api/pages/${pageId}/snapshots/delete/${snapshotId}`);
}
