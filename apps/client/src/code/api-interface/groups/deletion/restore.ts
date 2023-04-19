export async function restoreGroup(groupId: string) {
  await trpcClient.groups.deletion.restore.mutate({
    groupId,
  });
}
