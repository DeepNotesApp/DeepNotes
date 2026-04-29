import {
  base64ToBytes,
  createKeyring,
  createPrivateKeyring,
  ensureSodiumReady,
  wrapKeyPair,
  wrapSymmetricKey,
  type KeyPair,
} from "@deepnotes/e2ee";
import { pack } from "msgpackr";

import { uint8ToBase64 } from "../auth/bytes";
import type { StoredSessionCrypto } from "../auth/crypto-storage";

async function unlockSessionKeyPair(stored: StoredSessionCrypto): Promise<KeyPair> {
  await ensureSodiumReady();
  const sessionKey = wrapSymmetricKey(base64ToBytes(stored.sessionKeyB64));
  const { userId } = stored;
  const publicKeyring = createKeyring(base64ToBytes(stored.publicKeyringB64));
  const privateKeyring = createPrivateKeyring(
    base64ToBytes(stored.encryptedPrivateKeyringB64),
  ).unwrapSymmetric(sessionKey, {
    associatedData: {
      context: "SessionUserPrivateKeyring",
      userId,
    },
  });
  return wrapKeyPair(publicKeyring, privateKeyring);
}

/**
 * Legacy `createNotifications` for `group-invitation-sent` (three audience buckets).
 * Returns bodies for `POST …/join-invitations` `notifications` array (base64 fields).
 */
export async function buildGroupInviteSentNotifications(input: {
  stored: StoredSessionCrypto;
  agentUserId: string;
  inviteeUserId: string;
  groupId: string;
  inviteeDisplayName: string;
  /** Until group name is exposed on `/me`, defaults are placeholders. */
  groupName?: string;
  agentName?: string;
  recipientPublicKeyrings: { userId: string; publicKeyring: Uint8Array }[];
}): Promise<
  Array<{
    type: "group-invitation-sent";
    encryptedContent: string;
    recipients: Record<string, { encryptedSymmetricKey: string }>;
  }>
> {
  await ensureSodiumReady();
  const keyPair = await unlockSessionKeyPair(input.stored);

  const recipients: Record<string, { publicKeyring: Uint8Array }> = {};
  for (const r of input.recipientPublicKeyrings) {
    recipients[r.userId] = { publicKeyring: r.publicKeyring };
  }

  const groupName = input.groupName ?? "Group";
  const agentName = input.agentName ?? "Someone";

  const agentSymmetricKey = wrapSymmetricKey();
  const targetSymmetricKey = wrapSymmetricKey();
  const observersSymmetricKey = wrapSymmetricKey();

  const out: Array<{
    type: "group-invitation-sent";
    encryptedContent: string;
    recipients: Record<string, { encryptedSymmetricKey: string }>;
  }> = [];

  {
    const recipientsEnc = {
      [input.agentUserId]: {
        encryptedSymmetricKey: uint8ToBase64(
          keyPair.encrypt(agentSymmetricKey.value, keyPair.publicKey, {
            padding: true,
          }),
        ),
      },
    };
    out.push({
      type: "group-invitation-sent",
      recipients: recipientsEnc,
      encryptedContent: uint8ToBase64(
        agentSymmetricKey.encrypt(
          pack({
            groupId: input.groupId,
            patientId: input.inviteeUserId,
            groupName,
            targetName: input.inviteeDisplayName,
            recipientType: "agent",
          }),
          {
            padding: true,
            associatedData: { context: "UserNotificationContent" },
          },
        ),
      ),
    });
  }

  if (recipients[input.inviteeUserId] != null) {
    const inviteePk = createKeyring(recipients[input.inviteeUserId]!.publicKeyring);
    out.push({
      type: "group-invitation-sent",
      recipients: {
        [input.inviteeUserId]: {
          encryptedSymmetricKey: uint8ToBase64(
            keyPair.encrypt(targetSymmetricKey.value, inviteePk, {
              padding: true,
            }),
          ),
        },
      },
      encryptedContent: uint8ToBase64(
        targetSymmetricKey.encrypt(
          pack({
            groupId: input.groupId,
            groupName,
            recipientType: "target",
          }),
          {
            padding: true,
            associatedData: { context: "UserNotificationContent" },
          },
        ),
      ),
    });
  }

  const observerRecipientEntries = Object.entries(recipients).filter(
    ([uid]) => uid !== input.agentUserId && uid !== input.inviteeUserId,
  );
  if (observerRecipientEntries.length > 0) {
    const obsRecipients: Record<string, { encryptedSymmetricKey: string }> = {};
    for (const [recipientUserId, { publicKeyring }] of observerRecipientEntries) {
      const pk = createKeyring(publicKeyring);
      obsRecipients[recipientUserId] = {
        encryptedSymmetricKey: uint8ToBase64(
          keyPair.encrypt(observersSymmetricKey.value, pk, {
            padding: true,
          }),
        ),
      };
    }
    out.push({
      type: "group-invitation-sent",
      recipients: obsRecipients,
      encryptedContent: uint8ToBase64(
        observersSymmetricKey.encrypt(
          pack({
            groupId: input.groupId,
            groupName,
            agentName,
            targetName: input.inviteeDisplayName,
            recipientType: "observer",
          }),
          {
            padding: true,
            associatedData: { context: "UserNotificationContent" },
          },
        ),
      ),
    });
  }

  return out;
}
