/**
 * Mirrors `@deepnotes/session` `group-role-ranks` for UI gating (no server imports in the bundle).
 */

const RANK: Record<string, number> = {
  owner: 5,
  admin: 4,
  moderator: 3,
  member: 2,
  viewer: 1,
};

export function canManageRole(managerRole: string, targetRole: string): boolean {
  const mr = RANK[managerRole];
  const tr = RANK[targetRole];
  if (mr == null || tr == null) {
    return false;
  }
  const manageLower = ["owner", "admin", "moderator"].includes(managerRole);
  const manageOwn = ["owner", "admin"].includes(managerRole);
  if (tr < mr) {
    return manageLower;
  }
  if (tr <= mr) {
    return manageOwn;
  }
  return false;
}

export function canChangeRole(
  managerRole: string,
  targetOldRole: string,
  targetNewRole: string,
): boolean {
  return (
    canManageRole(managerRole, targetOldRole) &&
    canManageRole(managerRole, targetNewRole)
  );
}

export function roleHasManageLowerRanks(role: string): boolean {
  return ["owner", "admin", "moderator"].includes(role);
}

/** Matches session `editGroupSettings` (owners and admins). */
export function canEditGroupSettings(viewerRole: string): boolean {
  return ["owner", "admin"].includes(viewerRole);
}
