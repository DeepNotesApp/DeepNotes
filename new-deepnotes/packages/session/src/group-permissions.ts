import type { DeepnotesDb } from "@deepnotes/db/client";
import { groupMembers, groups } from "@deepnotes/db/schema";
import { and, eq } from "drizzle-orm";

/** Mirrors legacy `@deeplib/misc` roles for `group_members.role` text. */
const ROLE_PERMISSIONS: Record<
  string,
  { viewGroupPages: boolean; editGroupPages: boolean }
> = {
  owner: { viewGroupPages: true, editGroupPages: true },
  admin: { viewGroupPages: true, editGroupPages: true },
  moderator: { viewGroupPages: true, editGroupPages: true },
  member: { viewGroupPages: true, editGroupPages: true },
  viewer: { viewGroupPages: true, editGroupPages: false },
};

export type GroupPagePermission = "viewGroupPages" | "editGroupPages";

export async function userHasGroupPermission(input: {
  db: DeepnotesDb;
  userId: string;
  groupId: string;
  permission: GroupPagePermission;
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

  return (
    group.accessKeyring != null && input.permission === "viewGroupPages"
  );
}
