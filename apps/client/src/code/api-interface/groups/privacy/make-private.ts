import type { GroupKeyRotationValues } from '../key-rotation';
import { processGroupKeyRotationValues } from '../key-rotation';

export async function makeGroupPrivate(groupId: string) {
  const groupKeyRotationValues = (
    await api().post<GroupKeyRotationValues>(
      `/api/groups/${groupId}/privacy/make-private`,
      {},
    )
  ).data;

  await api().post(
    `/api/groups/${groupId}/privacy/make-private`,
    await processGroupKeyRotationValues(groupId, {
      ...groupKeyRotationValues,

      groupIsPublic: false,
    }),
  );
}
