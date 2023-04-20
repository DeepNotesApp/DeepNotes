export async function deleteGroupPermanently(groupId: string) {
  await trpcClient.groups.deletion.deletePermanently.mutate({
    groupId,
  });
}
