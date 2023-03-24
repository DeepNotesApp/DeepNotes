export async function restoreGroup(groupId: string) {
  await api().post(`/api/groups/${groupId}/deletion/restore`);
}
