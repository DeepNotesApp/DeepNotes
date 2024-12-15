export async function deleteGroupPermanently(input: { groupId: string }) {
  await trpcClient.groups.deletion.deletePermanently.mutate({
    groupId: input.groupId,
  });
}
