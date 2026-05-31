import type { DeepnotesDb } from "@deepnotes/db/client";
import { groups, pages } from "@deepnotes/db/schema";
import { and, isNotNull, lt } from "drizzle-orm";

export async function performScheduledCleanup(input: {
  db: DeepnotesDb;
}): Promise<{ deletedPages: number; deletedGroups: number }> {
  const now = new Date().toISOString();

  const deletedPagesResult = await input.db
    .delete(pages)
    .where(
      and(isNotNull(pages.permanentDeletionDate), lt(pages.permanentDeletionDate, now)),
    )
    .returning({ id: pages.id });

  const deletedGroupsResult = await input.db
    .delete(groups)
    .where(
      and(
        isNotNull(groups.permanentDeletionDate),
        lt(groups.permanentDeletionDate, now),
      ),
    )
    .returning({ id: groups.id });

  return {
    deletedPages: deletedPagesResult.length,
    deletedGroups: deletedGroupsResult.length,
  };
}
