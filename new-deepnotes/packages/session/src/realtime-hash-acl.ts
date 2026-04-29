import type { DeepnotesDb } from "@deepnotes/db/client";
import { pages } from "@deepnotes/db/schema";
import { and, inArray, isNull } from "drizzle-orm";

import { userHasGroupPermission } from "./group-permissions.js";

export type RealtimeHashAccessNeeds = {
  read: boolean;
  write: boolean;
};

/** Redis-style key `prefix:suffix` (suffix is pageId, groupId, or userId). */
export function splitRealtimeHashKey(
  redisKey: string,
): { prefix: string; suffix: string } | null {
  const i = redisKey.indexOf(":");
  if (i <= 0 || i === redisKey.length - 1) {
    return null;
  }
  return {
    prefix: redisKey.slice(0, i),
    suffix: redisKey.slice(i + 1),
  };
}

/**
 * Resolves whether a user may read/write realtime hash fields for `user:` / `group:` / `page:`
 * keys. Read maps to `viewGroupPages`, write to `editGroupPages` (same as legacy hash-backed
 * title/cache projection).
 */
export async function resolveRealtimeHashFieldAccess(input: {
  db: DeepnotesDb;
  userId: string;
  needs: Map<string, RealtimeHashAccessNeeds>;
}): Promise<Map<string, { readOk: boolean; writeOk: boolean }>> {
  const out = new Map<string, { readOk: boolean; writeOk: boolean }>();

  const pageIds = new Set<string>();
  for (const key of input.needs.keys()) {
    const p = splitRealtimeHashKey(key);
    if (p?.prefix === "page") {
      pageIds.add(p.suffix);
    }
  }

  const pageIdToGroupId = new Map<string, string>();
  if (pageIds.size > 0) {
    const rows = await input.db
      .select({ id: pages.id, groupId: pages.groupId })
      .from(pages)
      .where(
        and(inArray(pages.id, [...pageIds]), isNull(pages.permanentDeletionDate)),
      );
    for (const r of rows) {
      pageIdToGroupId.set(r.id, r.groupId);
    }
  }

  const groupPermCache = new Map<string, { view: boolean; edit: boolean }>();

  async function permsForGroup(groupId: string): Promise<{
    view: boolean;
    edit: boolean;
  }> {
    let cached = groupPermCache.get(groupId);
    if (cached == null) {
      const [view, edit] = await Promise.all([
        userHasGroupPermission({
          db: input.db,
          userId: input.userId,
          groupId,
          permission: "viewGroupPages",
        }),
        userHasGroupPermission({
          db: input.db,
          userId: input.userId,
          groupId,
          permission: "editGroupPages",
        }),
      ]);
      cached = { view, edit };
      groupPermCache.set(groupId, cached);
    }
    return cached;
  }

  for (const [key, need] of input.needs) {
    const parsed = splitRealtimeHashKey(key);
    if (parsed == null) {
      out.set(key, {
        readOk: !need.read,
        writeOk: !need.write,
      });
      continue;
    }

    const { prefix, suffix } = parsed;
    let allowedRead = false;
    let allowedWrite = false;

    if (prefix === "user") {
      allowedRead = allowedWrite = suffix === input.userId;
    } else if (prefix === "group") {
      const g = await permsForGroup(suffix);
      allowedRead = g.view;
      allowedWrite = g.edit;
    } else if (prefix === "page") {
      const gid = pageIdToGroupId.get(suffix);
      if (gid != null) {
        const g = await permsForGroup(gid);
        allowedRead = g.view;
        allowedWrite = g.edit;
      }
    }

    out.set(key, {
      readOk: !need.read || allowedRead,
      writeOk: !need.write || allowedWrite,
    });
  }

  return out;
}
