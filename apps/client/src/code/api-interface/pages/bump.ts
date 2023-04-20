export async function bumpPage(input: {
  pageId: string;

  parentPageId?: string;
}) {
  await trpcClient.pages.bump.mutate({
    pageId: input.pageId,

    parentPageId: input.parentPageId,
  });
}
