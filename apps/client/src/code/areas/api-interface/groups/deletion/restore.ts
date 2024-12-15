export async function restoreGroup(input: { groupId: string }) {
  await trpcClient.groups.deletion.restore.mutate({
    groupId: input.groupId,
  });
}
