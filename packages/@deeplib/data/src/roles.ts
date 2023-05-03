import type { IGroupRole } from '@deeplib/misc';
import { rolesMap } from '@deeplib/misc';
import type { DataAbstraction } from '@stdlib/data';

export async function userHasPermission(
  dataAbstraction: DataAbstraction,
  userId: any,
  groupId: any,
  permission: keyof IGroupRole['permissions'],
) {
  if (groupId == null) {
    return false;
  }

  if (userId != null) {
    const groupMemberRole = await dataAbstraction.hget(
      'group-member',
      `${groupId}:${userId}`,
      'role',
    );

    if (rolesMap()[groupMemberRole!]?.permissions[permission]) {
      return true;
    }
  }

  const groupIsPublic = await dataAbstraction.hget(
    'group',
    groupId,
    'is-public',
  );

  return !!groupIsPublic && permission === 'viewGroupPages';
}
