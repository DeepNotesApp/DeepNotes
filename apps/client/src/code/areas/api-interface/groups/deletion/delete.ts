export async function deleteGroup(input: { groupId: string }) {
  await trpcClient.groups.deletion.delete.mutate({
    groupId: input.groupId,
  });
}
