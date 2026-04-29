import type { DeepnotesDb } from "@deepnotes/db/client";
import {
  groupMembers,
  notifications,
  users,
  usersNotifications,
} from "@deepnotes/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { Buffer } from "node:buffer";
import { pack } from "msgpackr";

export type NotifyUsersItem = {
  type: string;
  encryptedContent: Uint8Array;
  recipients: Record<string, Uint8Array>;
};

/** Inner `msgpackr.pack(DeepNotesNotification)` bytes for realtime push (legacy `user-notification` channel). */
export type RealtimeNotificationDelivery = {
  userId: string;
  notificationInnerPacked: Uint8Array;
};

export async function listGroupInviteNotificationRecipientIds(input: {
  db: DeepnotesDb;
  groupId: string;
  inviteeUserId: string;
}): Promise<Set<string>> {
  const managers = await input.db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, input.groupId),
        inArray(groupMembers.role, ["owner", "admin", "moderator"]),
      ),
    );
  const ids = new Set<string>();
  for (const r of managers) {
    ids.add(r.userId);
  }
  ids.add(input.inviteeUserId);
  return ids;
}

/**
 * Persist `notifications` + `users_notifications` rows (legacy `notifyUsers` DB half).
 * Returns msgpack payloads per recipient for optional realtime fan-out.
 */
export async function performNotifyUsers(input: {
  db: DeepnotesDb;
  items: NotifyUsersItem[];
}): Promise<RealtimeNotificationDelivery[]> {
  if (input.items.length === 0) {
    return [];
  }

  const deliveries: RealtimeNotificationDelivery[] = [];
  const dateTime = new Date();

  for (const item of input.items) {
    const recipientEntries = Object.entries(item.recipients);
    if (recipientEntries.length === 0) {
      continue;
    }

    await input.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(notifications)
        .values({
          type: item.type,
          encryptedContent: Buffer.from(item.encryptedContent),
          datetime: dateTime.toISOString(),
        })
        .returning({ id: notifications.id });

      if (row == null) {
        throw new Error("notifyUsers: insert returned no id");
      }

      for (const [userId, encSym] of recipientEntries) {
        await tx.insert(usersNotifications).values({
          userId,
          notificationId: row.id,
          encryptedSymmetricKey: Buffer.from(encSym),
        });

        const packed = new Uint8Array(
          pack({
            id: row.id,
            type: item.type,
            encryptedSymmetricKey: encSym,
            encryptedContent: item.encryptedContent,
            dateTime,
          }),
        );
        deliveries.push({ userId, notificationInnerPacked: packed });
      }
    });
  }

  return deliveries;
}

/** Public keyrings for managers ∪ invitee (legacy `getGroupManagers` + invitee). */
export async function loadGroupInviteNotificationRecipientPublicKeyrings(input: {
  db: DeepnotesDb;
  groupId: string;
  inviteeUserId: string;
}): Promise<{ userId: string; publicKeyring: Buffer }[]> {
  const [invitee] = await input.db
    .select({ userId: users.id, publicKeyring: users.publicKeyring })
    .from(users)
    .where(eq(users.id, input.inviteeUserId))
    .limit(1);

  const managers = await input.db
    .select({
      userId: users.id,
      publicKeyring: users.publicKeyring,
    })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(
      and(
        eq(groupMembers.groupId, input.groupId),
        inArray(groupMembers.role, ["owner", "admin", "moderator"]),
      ),
    );

  const byUser = new Map<string, Buffer>();
  for (const r of managers) {
    byUser.set(r.userId, r.publicKeyring);
  }
  if (invitee != null) {
    byUser.set(invitee.userId, invitee.publicKeyring);
  }

  return [...byUser.entries()].map(([userId, publicKeyring]) => ({
    userId,
    publicKeyring,
  }));
}
