export async function createPageBacklink(input: {
  sourcePageId: string;
  targetUrl: string;
}) {
  const pageLinkMatch = input.targetUrl.match(/\/pages\/([\w-]{21})(?:$|\/)/);

  if (pageLinkMatch == null) {
    return;
  }

  await trpcClient.pages.backlinks.create.mutate({
    sourcePageId: input.sourcePageId,
    targetPageId: pageLinkMatch[1],
  });
}
