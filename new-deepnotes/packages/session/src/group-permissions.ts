import type { DeepnotesDb } from "@deepnotes/db/client";
import { groupMembers, groups } from "@deepnotes/db/schema";
import { and, eq } from "drizzle-orm";

/** Mirrors legacy `@deeplib/misc` roles for `group_members.role` text. */
const ROLE_PERMISSIONS: Record<
  string,
  {
    viewGroupPages: boolean;
    editGroupPages: boolean;
    viewGroupMembers: boolean;
  }
> = {
  owner: { viewGroupPages: true, editGroupPages: true, viewGroupMembers: true },
  admin: { viewGroupPages: true, editGroupPages: true, viewGroupMembers: true },
  moderator: {
    viewGroupPages: true,
    editGroupPages: true,
    viewGroupMembers: true,
  },
  member: { viewGroupPages: true, editGroupPages: true, viewGroupMembers: true },
  viewer: {
    viewGroupPages: true,
    editGroupPages: false,
    viewGroupMembers: true,
  },
};

export type GroupPermission =
  | "viewGroupPages"
  | "editGroupPages"
  | "viewGroupMembers";

export async function userHasGroupPermission(input: {
  db: DeepnotesDb;
  userId: string;
  groupId: string;
  permission: GroupPermission;
}): Promise<boolean> {
  const [group] = await input.db
    .select({ accessKeyring: groups.accessKeyring })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);

  if (group == null) {
    return false;
  }

  const [member] = await input.db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, input.groupId),
        eq(groupMembers.userId, input.userId),
      ),
    )
    .limit(1);

  if (member != null) {
    const perms = ROLE_PERMISSIONS[member.role];
    if (perms?.[input.permission]) {
      return true;
    }
  }

  // Legacy `userHasPermission`: public groups grant `viewGroupPages` only, not
  // `viewGroupMembers` (see `@deeplib/data` roles.ts).
  return (
    group.accessKeyring != null && input.permission === "viewGroupPages"
  );
}
