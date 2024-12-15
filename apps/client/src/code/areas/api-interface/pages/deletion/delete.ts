export async function deletePage(pageId: string) {
  await trpcClient.pages.deletion.delete.mutate({ pageId });
}
