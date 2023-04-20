export async function deletePagePermanently(pageId: string) {
  await trpcClient.pages.deletion.deletePermanently.mutate({ pageId });
}
