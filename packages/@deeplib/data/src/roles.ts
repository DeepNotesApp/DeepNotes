import type { GroupRoleID, IGroupRole } from '@deeplib/misc';
import { rolesMap } from '@deeplib/misc';
import type { DataAbstraction } from '@stdlib/data';
import { allAsyncProps } from '@stdlib/misc';

export async function userHasPermission(
  dataAbstraction: DataAbstraction,
  userId: any,
  groupId: any,
  permission: keyof IGroupRole['permissions'],
  params?: { publicGroups?: boolean },
) {
  if (groupId == null) {
    return false;
  }

  const promises: {
    groupMemberRole?: Promise<GroupRoleID>;
    groupIsPublic?: Promise<boolean>;
  } = {};

  if (userId != null) {
    promises['groupMemberRole'] = await dataAbstraction.hget(
      'group-member',
      `${groupId}:${userId}`,
      'role',
    );
  }

  if (params?.publicGroups) {
    promises['groupIsPublic'] = await dataAbstraction.hget(
      'group',
      groupId,
      'is-public',
    );
  }

  const { groupMemberRole, groupIsPublic } = await allAsyncProps(promises);

  return (
    (rolesMap()[groupMemberRole!]?.permissions[permission] ?? false) ||
    (!!params?.publicGroups && !!groupIsPublic)
  );
}
