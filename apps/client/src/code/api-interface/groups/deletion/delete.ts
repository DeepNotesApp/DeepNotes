export async function deleteGroup(groupId: string) {
  await trpcClient.groups.deletion.delete.mutate({
    groupId,
  });
}
