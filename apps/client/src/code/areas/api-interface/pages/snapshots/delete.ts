export async function deletePageSnapshot(pageId: string, snapshotId: string) {
  await trpcClient.pages.snapshots.delete.mutate({
    pageId,
    snapshotId,
  });
}
