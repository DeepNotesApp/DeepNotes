export async function restorePageDeletion(pageId: string) {
  await trpcClient.pages.deletion.restore.mutate({ pageId });
}
