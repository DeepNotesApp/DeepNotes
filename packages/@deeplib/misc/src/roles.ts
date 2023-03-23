import { once } from '@stdlib/misc';

export interface IGroupRole {
  id: GroupRoleID;
  name: string;
  rank: number;
  permissions: {
    manageOwnRank: boolean;
    manageLowerRanks: boolean;

    editGroupSettings: boolean;
    editGroupPages: boolean;

    viewGroup: boolean;
  };
  description: string;
}

export type GroupRoleID = 'owner' | 'admin' | 'moderator' | 'member' | 'viewer';

export const roles = once((): IGroupRole[] => [
  {
    id: 'owner',

    name: 'Owner',

    rank: 5,
    permissions: {
      manageOwnRank: true,
      manageLowerRanks: true,

      editGroupSettings: true,
      editGroupPages: true,

      viewGroup: true,
    },

    description: 'Manages everyone in the group',
  },
  {
    id: 'admin',

    name: 'Admin',

    rank: 4,
    permissions: {
      manageOwnRank: true,
      manageLowerRanks: true,

      editGroupSettings: true,
      editGroupPages: true,

      viewGroup: true,
    },

    description: 'Autonomous role. Manages everyone, except the owner(s)',
  },
  {
    id: 'moderator',

    name: 'Moderator',

    rank: 3,
    permissions: {
      manageOwnRank: false,
      manageLowerRanks: true,

      editGroupSettings: false,
      editGroupPages: true,

      viewGroup: true,
    },

    description: 'Manages members and viewers of the group',
  },
  {
    id: 'member',

    name: 'Member',

    rank: 2,
    permissions: {
      manageOwnRank: false,
      manageLowerRanks: false,

      editGroupSettings: false,
      editGroupPages: true,

      viewGroup: true,
    },

    description: 'Can see and edit pages',
  },
  {
    id: 'viewer',

    name: 'Viewer',

    rank: 1,
    permissions: {
      manageOwnRank: false,
      manageLowerRanks: false,

      editGroupSettings: false,
      editGroupPages: false,

      viewGroup: true,
    },

    description: 'Can see pages, but not edit them',
  },
]);

export const rolesMap = once(() =>
  roles().reduce((acc, role) => {
    acc[role.id] = role;
    return acc;
  }, {} as Record<string, IGroupRole>)
);

export function canManageRole(managerRole: string, targetRole: string) {
  const managerRoleInfo = rolesMap()[managerRole as any];
  const targetRoleInfo = rolesMap()[targetRole as any];

  if (managerRoleInfo == null || targetRoleInfo == null) {
    return false;
  }

  if (targetRoleInfo.rank < managerRoleInfo.rank) {
    return managerRoleInfo.permissions.manageLowerRanks;
  }
  if (targetRoleInfo.rank <= managerRoleInfo.rank) {
    return managerRoleInfo.permissions.manageOwnRank;
  }

  return false;
}

export function canChangeRole(
  managerRole: string,
  targetOldRole: string,
  targetNewRole: string
) {
  return (
    canManageRole(managerRole, targetOldRole) &&
    canManageRole(managerRole, targetNewRole)
  );
}
