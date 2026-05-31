import type { DeepnotesDb } from "@deepnotes/db/client";
import {
  groupJoinInvitations,
  groupJoinRequests,
  groupMembers,
  groups,
  pages,
} from "@deepnotes/db/schema";
import { and, eq } from "drizzle-orm";
import { Buffer } from "node:buffer";

import type { SessionEnv } from "@deepnotes/session-core";
import { SessionError } from "@deepnotes/session-core";
import { userHasGroupPermission } from "@deepnotes/session-core";
import { getAuthenticatedUserSummary } from "@deepnotes/session-core";
import { assertUserProPlan } from "@deepnotes/session-core";

async function requireEditGroupSettings(input: {
  db: DeepnotesDb;
  userId: string;
  groupId: string;
}): Promise<void> {
  const allowed = await userHasGroupPermission({
    db: input.db,
    userId: input.userId,
    groupId: input.groupId,
    permission: "editGroupSettings",
  });
  if (!allowed) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }
}

/**
 * `groups.privacy.makePublic` — shared read keyring; clears member/invite
 * `encrypted_access_keyring` (legacy KeyDB parity).
 */
export async function performGroupPrivacyMakePublic(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
  accessKeyring: Uint8Array;
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });
  await assertUserProPlan({ db: input.db, userId });
  await requireEditGroupSettings({ db: input.db, userId, groupId: input.groupId });

  const [g] = await input.db
    .select({ accessKeyring: groups.accessKeyring })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);
  if (g == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }
  if (g.accessKeyring != null) {
    throw new SessionError(400, "BAD_REQUEST", "Group is already public.");
  }

  await input.db.transaction(async (tx) => {
    await tx
      .update(groups)
      .set({ accessKeyring: Buffer.from(input.accessKeyring) })
      .where(eq(groups.id, input.groupId));
    await tx
      .update(groupMembers)
      .set({ encryptedAccessKeyring: null })
      .where(eq(groupMembers.groupId, input.groupId));
    await tx
      .update(groupJoinInvitations)
      .set({ encryptedAccessKeyring: null })
      .where(eq(groupJoinInvitations.groupId, input.groupId));
  });
}

export async function performGroupPrivacySetJoinRequestsAllowed(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
  areJoinRequestsAllowed: boolean;
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });
  await assertUserProPlan({ db: input.db, userId });
  await requireEditGroupSettings({ db: input.db, userId, groupId: input.groupId });

  const [g] = await input.db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);
  if (g == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }

  await input.db
    .update(groups)
    .set({ areJoinRequestsAllowed: input.areJoinRequestsAllowed })
    .where(eq(groups.id, input.groupId));
}

export type GroupPrivacyPrivateMemberPayload = {
  encryptedAccessKeyring?: Uint8Array;
  encryptedInternalKeyring: Uint8Array;
  encryptedName: Uint8Array | null;
};

export type GroupPrivacyPrivateInvitationPayload = {
  encryptedAccessKeyring?: Uint8Array;
  encryptedInternalKeyring: Uint8Array;
  encryptedName: Uint8Array;
};

export type GroupPrivacyPrivateJoinRequestPayload = {
  encryptedName: Uint8Array;
};

export type GroupPrivacyPrivatePagePayload = {
  encryptedSymmetricKeyring: Uint8Array;
};

export type GroupPrivacyPrivatePayload = {
  groupAccessKeyring?: Uint8Array;
  groupEncryptedName: Uint8Array;
  groupEncryptedContentKeyring: Uint8Array;
  groupPublicKeyring: Uint8Array;
  groupEncryptedPrivateKeyring: Uint8Array;
  groupMembers: Record<string, GroupPrivacyPrivateMemberPayload>;
  groupJoinInvitations: Record<string, GroupPrivacyPrivateInvitationPayload>;
  groupJoinRequests: Record<string, GroupPrivacyPrivateJoinRequestPayload>;
  groupPages: Record<string, GroupPrivacyPrivatePagePayload>;
};

function sortedIds(ids: string[]): string[] {
  return [...ids].sort();
}

function assertSameKeyset(
  label: string,
  expected: string[],
  payload: Record<string, unknown>,
): void {
  const exp = sortedIds(expected);
  const got = sortedIds(Object.keys(payload));
  if (exp.length !== got.length || exp.some((id, i) => id !== got[i])) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      `${label} keys do not match current group state.`,
    );
  }
}

/**
 * `groups.privacy.makePrivate` — one-shot re-key while clearing shared `access_keyring`
 * (legacy two-step WS collapsed). Payload mirrors legacy `rotateGroupKeys` / `groupKeyRotationSchema`.
 * Does not bump `pages.next_key_rotation_date` (rotation machinery removed per RESTART_PLAN).
 */
export async function performGroupPrivacyMakePrivate(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
  payload: GroupPrivacyPrivatePayload;
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });
  await assertUserProPlan({ db: input.db, userId });
  await requireEditGroupSettings({ db: input.db, userId, groupId: input.groupId });

  const [g] = await input.db
    .select({
      accessKeyring: groups.accessKeyring,
    })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);
  if (g == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }
  if (g.accessKeyring == null) {
    throw new SessionError(400, "BAD_REQUEST", "Group is already private.");
  }

  const memberRows = await input.db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, input.groupId));
  const memberIds = memberRows.map((r) => r.userId);

  const invitationRows = await input.db
    .select({ userId: groupJoinInvitations.userId })
    .from(groupJoinInvitations)
    .where(eq(groupJoinInvitations.groupId, input.groupId));
  const invitationIds = invitationRows.map((r) => r.userId);

  const requestRows = await input.db
    .select({ userId: groupJoinRequests.userId })
    .from(groupJoinRequests)
    .where(eq(groupJoinRequests.groupId, input.groupId));
  const requestIds = requestRows.map((r) => r.userId);

  const pageRows = await input.db
    .select({ id: pages.id })
    .from(pages)
    .where(eq(pages.groupId, input.groupId));
  const pageIds = pageRows.map((r) => r.id);

  assertSameKeyset("groupMembers", memberIds, input.payload.groupMembers);
  assertSameKeyset(
    "groupJoinInvitations",
    invitationIds,
    input.payload.groupJoinInvitations,
  );
  assertSameKeyset(
    "groupJoinRequests",
    requestIds,
    input.payload.groupJoinRequests,
  );
  assertSameKeyset("groupPages", pageIds, input.payload.groupPages);

  const accessOut =
    input.payload.groupAccessKeyring != null
      ? Buffer.from(input.payload.groupAccessKeyring)
      : null;

  await input.db.transaction(async (tx) => {
    await tx
      .update(groups)
      .set({
        accessKeyring: accessOut,
        encryptedName: Buffer.from(input.payload.groupEncryptedName),
        encryptedContentKeyring: Buffer.from(
          input.payload.groupEncryptedContentKeyring,
        ),
        publicKeyring: Buffer.from(input.payload.groupPublicKeyring),
        encryptedPrivateKeyring: Buffer.from(
          input.payload.groupEncryptedPrivateKeyring,
        ),
      })
      .where(eq(groups.id, input.groupId));

    for (const userId_ of memberIds) {
      const m = input.payload.groupMembers[userId_]!;
      await tx
        .update(groupMembers)
        .set({
          encryptedAccessKeyring:
            m.encryptedAccessKeyring != null
              ? Buffer.from(m.encryptedAccessKeyring)
              : null,
          encryptedInternalKeyring: Buffer.from(m.encryptedInternalKeyring),
          encryptedName:
            m.encryptedName != null ? Buffer.from(m.encryptedName) : null,
        })
        .where(
          and(
            eq(groupMembers.groupId, input.groupId),
            eq(groupMembers.userId, userId_),
          ),
        );
    }

    for (const userId_ of invitationIds) {
      const inv = input.payload.groupJoinInvitations[userId_]!;
      await tx
        .update(groupJoinInvitations)
        .set({
          encryptedAccessKeyring:
            inv.encryptedAccessKeyring != null
              ? Buffer.from(inv.encryptedAccessKeyring)
              : null,
          encryptedInternalKeyring: Buffer.from(inv.encryptedInternalKeyring),
          encryptedName: Buffer.from(inv.encryptedName),
        })
        .where(
          and(
            eq(groupJoinInvitations.groupId, input.groupId),
            eq(groupJoinInvitations.userId, userId_),
          ),
        );
    }

    for (const userId_ of requestIds) {
      const jr = input.payload.groupJoinRequests[userId_]!;
      await tx
        .update(groupJoinRequests)
        .set({ encryptedName: Buffer.from(jr.encryptedName) })
        .where(
          and(
            eq(groupJoinRequests.groupId, input.groupId),
            eq(groupJoinRequests.userId, userId_),
          ),
        );
    }

    for (const pageId of pageIds) {
      const p = input.payload.groupPages[pageId]!;
      await tx
        .update(pages)
        .set({
          encryptedSymmetricKeyring: Buffer.from(p.encryptedSymmetricKeyring),
        })
        .where(eq(pages.id, pageId));
    }
  });
}
