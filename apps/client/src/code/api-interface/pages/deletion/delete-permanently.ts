export async function deletePagePermanently(pageId: string) {
  await api().post(`/api/pages/${pageId}/deletion/delete-permanently`);
}
