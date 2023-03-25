export async function deleteGroupPermanently(groupId: string) {
  await api().post(`/api/groups/${groupId}/deletion/delete-permanently`);
}
