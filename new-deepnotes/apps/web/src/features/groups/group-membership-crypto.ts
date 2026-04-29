import {
  base64ToBytes,
  createKeyring,
  createPrivateKeyring,
  createSymmetricKeyring,
  DataLayer,
  ensureSodiumReady,
  wrapKeyPair,
  wrapSymmetricKey,
  type KeyPair,
} from "@deepnotes/e2ee";

import { uint8ToBase64 } from "../auth/bytes";
import type { StoredSessionCrypto } from "../auth/crypto-storage";

export type InviteCryptoBootstrapJson = {
  groupPublicKeyring: string;
  groupAccessKeyring: string | null;
  memberEncryptedAccessKeyring: string | null;
  memberEncryptedInternalKeyring: string;
  notificationRecipientPublicKeyrings?: {
    userId: string;
    publicKeyring: string;
  }[];
};

function textToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function pickAccessKeyringBytes(input: {
  memberB64: string | null;
  groupB64: string | null;
}): Uint8Array {
  if (input.memberB64 != null && input.memberB64.length > 0) {
    return base64ToBytes(input.memberB64);
  }
  if (input.groupB64 != null && input.groupB64.length > 0) {
    return base64ToBytes(input.groupB64);
  }
  throw new Error("No group access key material.");
}

async function unlockSessionKeyPair(
  stored: StoredSessionCrypto,
): Promise<KeyPair> {
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

async function wrapGroupKeyringsForRecipientPublicKey(input: {
  keyPair: KeyPair;
  bootstrap: InviteCryptoBootstrapJson;
  recipientPublicKeyringB64: string;
  groupIsPublic: boolean;
}): Promise<{
  encryptedAccessKeyring?: string;
  encryptedInternalKeyring: string;
}> {
  await ensureSodiumReady();
  const { keyPair } = input;
  const recipientPk = createKeyring(
    base64ToBytes(input.recipientPublicKeyringB64),
  );

  let ir = createSymmetricKeyring(
    base64ToBytes(input.bootstrap.memberEncryptedInternalKeyring),
  );
  if (ir.topLayer === DataLayer.Asymmetric) {
    ir = ir.unwrapAsymmetric(keyPair.privateKey);
  }
  if (ir.topLayer !== DataLayer.Raw) {
    throw new Error(
      "Could not unwrap group internal keyring (unsupported lock).",
    );
  }
  const encInternal = uint8ToBase64(
    ir.wrapAsymmetric(keyPair, recipientPk).wrappedValue,
  );

  let encAccess: string | undefined;
  if (!input.groupIsPublic) {
    const accessBytes = pickAccessKeyringBytes({
      memberB64: input.bootstrap.memberEncryptedAccessKeyring,
      groupB64: input.bootstrap.groupAccessKeyring,
    });
    let accessRing = createSymmetricKeyring(accessBytes);
    if (accessRing.topLayer === DataLayer.Asymmetric) {
      accessRing = accessRing.unwrapAsymmetric(keyPair.privateKey);
    }
    if (accessRing.topLayer !== DataLayer.Raw) {
      throw new Error(
        "Group access keyring is still locked (e.g. group password).",
      );
    }
    encAccess = uint8ToBase64(
      accessRing.wrapAsymmetric(keyPair, recipientPk).wrappedValue,
    );
  }

  return {
    encryptedAccessKeyring: encAccess,
    encryptedInternalKeyring: encInternal,
  };
}

/**
 * Raw `groups.access_keyring` bytes for `POST …/privacy/public` (legacy `accessKeyring.wrappedValue`).
 */
export async function buildMakePublicAccessKeyringB64(input: {
  stored: StoredSessionCrypto;
  bootstrap: InviteCryptoBootstrapJson;
}): Promise<string> {
  await ensureSodiumReady();
  const keyPair = await unlockSessionKeyPair(input.stored);
  const accessBytes = pickAccessKeyringBytes({
    memberB64: input.bootstrap.memberEncryptedAccessKeyring,
    groupB64: input.bootstrap.groupAccessKeyring,
  });
  let accessRing = createSymmetricKeyring(accessBytes);
  if (accessRing.topLayer === DataLayer.Asymmetric) {
    accessRing = accessRing.unwrapAsymmetric(keyPair.privateKey);
  }
  if (accessRing.topLayer !== DataLayer.Raw) {
    throw new Error(
      "Group access keyring is still locked (e.g. group password). Public transition is not available until unlock is implemented.",
    );
  }
  return uint8ToBase64(accessRing.wrappedValue);
}

/**
 * Ciphertexts for `POST /api/groups/{groupId}/join-invitations` (manager).
 */
export async function buildJoinInvitationSendBodies(input: {
  stored: StoredSessionCrypto;
  bootstrap: InviteCryptoBootstrapJson;
  inviteePublicKeyringB64: string;
  /** Display name for the invitee as stored on the group row. */
  inviteeDisplayName: string;
  groupIsPublic: boolean;
}): Promise<{
  encryptedAccessKeyring?: string;
  encryptedInternalKeyring: string;
  userEncryptedName: string;
  userEncryptedNameForUser: string;
}> {
  await ensureSodiumReady();
  const keyPair = await unlockSessionKeyPair(input.stored);
  const inviteePk = createKeyring(
    base64ToBytes(input.inviteePublicKeyringB64),
  );
  const groupPk = createKeyring(base64ToBytes(input.bootstrap.groupPublicKeyring));

  const wrapped = await wrapGroupKeyringsForRecipientPublicKey({
    keyPair,
    bootstrap: input.bootstrap,
    recipientPublicKeyringB64: input.inviteePublicKeyringB64,
    groupIsPublic: input.groupIsPublic,
  });

  const nameBytes = textToBytes(input.inviteeDisplayName);
  const userEncryptedName = uint8ToBase64(
    keyPair.encrypt(nameBytes, groupPk, { padding: true }),
  );
  const userEncryptedNameForUser = uint8ToBase64(
    keyPair.encrypt(nameBytes, inviteePk, { padding: true }),
  );

  return {
    ...wrapped,
    userEncryptedName,
    userEncryptedNameForUser,
  };
}

/** `POST …/join-invitations/me/accept` body. */
export async function buildJoinInvitationAcceptBody(input: {
  stored: StoredSessionCrypto;
  groupPublicKeyringB64: string;
  displayName: string;
}): Promise<{ userEncryptedName: string }> {
  await ensureSodiumReady();
  const keyPair = await unlockSessionKeyPair(input.stored);
  const groupPk = createKeyring(base64ToBytes(input.groupPublicKeyringB64));
  const userEncryptedName = uint8ToBase64(
    keyPair.encrypt(textToBytes(input.displayName), groupPk, {
      padding: true,
    }),
  );
  return { userEncryptedName };
}

/** `POST …/join-requests` body (requester). */
export async function buildJoinRequestSendBodies(input: {
  stored: StoredSessionCrypto;
  groupPublicKeyringB64: string;
  groupId: string;
  displayName: string;
}): Promise<{
  encryptedUserName: string;
  encryptedUserNameForUser: string;
}> {
  await ensureSodiumReady();
  const keyPair = await unlockSessionKeyPair(input.stored);
  const sessionKey = wrapSymmetricKey(base64ToBytes(input.stored.sessionKeyB64));
  const { userId } = input.stored;

  const groupPk = createKeyring(base64ToBytes(input.groupPublicKeyringB64));
  const nameBytes = textToBytes(input.displayName);
  const encryptedUserName = uint8ToBase64(
    keyPair.encrypt(nameBytes, groupPk, { padding: true }),
  );

  const userSym = createSymmetricKeyring(
    base64ToBytes(input.stored.encryptedSymmetricKeyringB64),
  ).unwrapSymmetric(sessionKey, {
    associatedData: {
      context: "SessionUserSymmetricKeyring",
      userId,
    },
  });
  if (userSym.topLayer !== DataLayer.Raw) {
    throw new Error("User symmetric keyring is not unlocked.");
  }
  const encryptedUserNameForUser = uint8ToBase64(
    userSym.encrypt(nameBytes, {
      padding: true,
      associatedData: {
        context: "GroupJoinRequestUserNameForUser",
        groupId: input.groupId,
        userId,
      },
    }),
  );

  return { encryptedUserName, encryptedUserNameForUser };
}

/** `POST …/join-requests/{userId}/accept` ciphertexts (manager). */
export async function buildJoinRequestAcceptBodies(input: {
  stored: StoredSessionCrypto;
  bootstrap: InviteCryptoBootstrapJson;
  requesterPublicKeyringB64: string;
  groupIsPublic: boolean;
}): Promise<{
  encryptedAccessKeyring?: string;
  encryptedInternalKeyring: string;
}> {
  await ensureSodiumReady();
  const keyPair = await unlockSessionKeyPair(input.stored);
  return wrapGroupKeyringsForRecipientPublicKey({
    keyPair,
    bootstrap: input.bootstrap,
    recipientPublicKeyringB64: input.requesterPublicKeyringB64,
    groupIsPublic: input.groupIsPublic,
  });
}
