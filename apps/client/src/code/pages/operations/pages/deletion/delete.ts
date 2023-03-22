export async function deletePage(pageId: string) {
  await api().post(`/api/pages/${pageId}/deletion/delete`);
}
