export async function restorePageDeletion(pageId: string) {
  await api().post(`/api/pages/${pageId}/deletion/restore`);
}
