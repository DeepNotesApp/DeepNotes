export async function bumpPage(input: {
  pageId: string;
  parentPageId?: string;
}) {
  await api().post(`/api/pages/${input.pageId}/bump`, {
    parentPageId: input.parentPageId,
  });
}
