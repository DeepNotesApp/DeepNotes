export async function deleteGroup(groupId: string) {
  await api().post(`/api/groups/${groupId}/deletion/delete`);
}
