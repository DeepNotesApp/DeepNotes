export async function bumpPage(
  pageId: string,
  { parentPageId }: { parentPageId?: string },
) {
  await api().post(`/api/pages/${pageId}/bump`, {
    parentPageId,
  });
}
