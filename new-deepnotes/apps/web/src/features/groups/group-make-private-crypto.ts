import {
  base64ToBytes,
  createKeyring,
  createPrivateKeyring,
  createSymmetricKeyring,
  DataLayer,
  ensureSodiumReady,
  wrapKeyPair,
  wrapSymmetricKey,
} from "@deepnotes/e2ee";
import sodium from "libsodium-wrappers-sumo";

import { uint8ToBase64 } from "../auth/bytes";
import type { StoredSessionCrypto } from "../auth/crypto-storage";

import type { components } from "@/api/api-types.generated";

export type GroupPrivacyMakePrivateBootstrapJson = {
  groupAccessKeyring: string | null;
  groupEncryptedName: string;
  groupEncryptedContentKeyring: string;
  groupPublicKeyring: string;
  groupEncryptedPrivateKeyring: string;
  groupEncryptedAccessKeyring: string | null;
  groupEncryptedInternalKeyring: string;
  groupMembers: Record<
    string,
    { publicKeyring: string; encryptedName: string | null }
  >;
  groupJoinInvitations: Record<
    string,
    { publicKeyring: string; encryptedName: string }
  >;
  groupJoinRequests: Record<string, { encryptedName: string }>;
  groupPages: Record<string, { encryptedSymmetricKeyring: string }>;
};

type Out = components["schemas"]["GroupPrivacyPrivateRequest"];

/**
 * Build `POST …/privacy/private` JSON (legacy WS `groups.privacy.makePrivate` step 2).
 * `groupIsPublic` must be **false** so the shared `access_keyring` is cleared and per-member access blobs are written.
 */
export async function buildGroupPrivacyMakePrivateRequest(input: {
  groupId: string;
  /** Always `false` for make-private (clears group-level access keyring). */
  groupIsPublic: boolean;
  stored: StoredSessionCrypto;
  bootstrap: GroupPrivacyMakePrivateBootstrapJson;
}): Promise<Out> {
  if (input.groupIsPublic) {
    throw new Error("groupIsPublic must be false for make-private.");
  }

  await ensureSodiumReady();
  const sessionKey = wrapSymmetricKey(
    base64ToBytes(input.stored.sessionKeyB64),
  );
  const { userId } = input.stored;

  const publicKeyring = createKeyring(
    base64ToBytes(input.stored.publicKeyringB64),
  );
  const privateKeyring = createPrivateKeyring(
    base64ToBytes(input.stored.encryptedPrivateKeyringB64),
  ).unwrapSymmetric(sessionKey, {
    associatedData: {
      context: "SessionUserPrivateKeyring",
      userId,
    },
  });
  const keyPair = wrapKeyPair(publicKeyring, privateKeyring);

  const b = input.bootstrap;
  const accessFromGroup =
    b.groupAccessKeyring != null && b.groupAccessKeyring.length > 0
      ? base64ToBytes(b.groupAccessKeyring)
      : null;
  const accessFromMember =
    b.groupEncryptedAccessKeyring != null &&
    b.groupEncryptedAccessKeyring.length > 0
      ? base64ToBytes(b.groupEncryptedAccessKeyring)
      : null;

  const oldGroupAccessKeyring =
    accessFromGroup != null
      ? createSymmetricKeyring(accessFromGroup)
      : createSymmetricKeyring(accessFromMember!).unwrapAsymmetric(
          keyPair.privateKey,
        );

  const oldGroupInternalKeyring = createSymmetricKeyring(
    base64ToBytes(b.groupEncryptedInternalKeyring),
  ).unwrapAsymmetric(keyPair.privateKey);

  const oldGroupPublicKeyring = createKeyring(base64ToBytes(b.groupPublicKeyring));
  const oldGroupPrivateKeyring = createPrivateKeyring(
    base64ToBytes(b.groupEncryptedPrivateKeyring),
  ).unwrapSymmetric(oldGroupInternalKeyring, {
    associatedData: {
      context: "GroupPrivateKeyring",
      groupId: input.groupId,
    },
  });

  const oldGroupContentKeyring = createSymmetricKeyring(
    base64ToBytes(b.groupEncryptedContentKeyring),
  ).unwrapSymmetric(oldGroupAccessKeyring, {
    associatedData: {
      context: "GroupContentKeyring",
      groupId: input.groupId,
    },
  });

  if (oldGroupContentKeyring.hasLayer(DataLayer.Symmetric)) {
    throw new Error(
      "This group uses a password-protected content keyring. Make-private from the browser is not supported until group password unlock is implemented.",
    );
  }

  const newGroupAccessKeyring = oldGroupAccessKeyring.addKey();
  const newGroupInternalKeyring = oldGroupInternalKeyring.addKey();
  const newGroupContentKeyring = oldGroupContentKeyring.addKey();

  const newGroupRawKeypair = sodium.crypto_box_keypair();
  const newGroupPublicKeyring = oldGroupPublicKeyring.addKey(
    newGroupRawKeypair.publicKey,
  );
  const newGroupPrivateKeyring = oldGroupPrivateKeyring.addKey(
    newGroupRawKeypair.privateKey,
  );

  const groupEncNameBytes = base64ToBytes(b.groupEncryptedName);
  const groupEncryptedNameOut =
    groupEncNameBytes.byteLength === 0
      ? new Uint8Array(0)
      : newGroupAccessKeyring.encrypt(
          oldGroupAccessKeyring.decrypt(groupEncNameBytes, {
            padding: true,
            associatedData: {
              context: "GroupName",
              groupId: input.groupId,
            },
          }),
          {
            padding: true,
            associatedData: {
              context: "GroupName",
              groupId: input.groupId,
            },
          },
        );

  const groupEncryptedContentKeyringOut = newGroupContentKeyring
    .wrapSymmetric(newGroupAccessKeyring, {
      associatedData: {
        context: "GroupContentKeyring",
        groupId: input.groupId,
      },
    })
    .wrappedValue;

  const groupEncryptedPrivateKeyringOut = newGroupPrivateKeyring
    .wrapSymmetric(newGroupInternalKeyring, {
      associatedData: {
        context: "GroupPrivateKeyring",
        groupId: input.groupId,
      },
    })
    .wrappedValue;

  const groupMembers: Out["groupMembers"] = {};
  for (const [uid, m] of Object.entries(b.groupMembers)) {
    const recvPk = createKeyring(base64ToBytes(m.publicKeyring));
    const encAccess = newGroupAccessKeyring.wrapAsymmetric(
      keyPair,
      recvPk,
    ).wrappedValue;
    const encInternal = newGroupInternalKeyring.wrapAsymmetric(
      keyPair,
      recvPk,
    ).wrappedValue;
    let encName: string | null = null;
    if (m.encryptedName != null && m.encryptedName.length > 0) {
      encName = uint8ToBase64(
        newGroupPrivateKeyring.encrypt(
          oldGroupPrivateKeyring.decrypt(base64ToBytes(m.encryptedName), {
            padding: true,
          }),
          newGroupPublicKeyring,
          newGroupPublicKeyring,
          { padding: true },
        ),
      );
    }
    groupMembers[uid] = {
      encryptedAccessKeyring: uint8ToBase64(encAccess),
      encryptedInternalKeyring: uint8ToBase64(encInternal),
      encryptedName: encName,
    };
  }

  const groupJoinInvitations: Out["groupJoinInvitations"] = {};
  for (const [uid, inv] of Object.entries(b.groupJoinInvitations)) {
    const recvPk = createKeyring(base64ToBytes(inv.publicKeyring));
    groupJoinInvitations[uid] = {
      encryptedAccessKeyring: uint8ToBase64(
        newGroupAccessKeyring.wrapAsymmetric(keyPair, recvPk).wrappedValue,
      ),
      encryptedInternalKeyring: uint8ToBase64(
        newGroupInternalKeyring.wrapAsymmetric(keyPair, recvPk).wrappedValue,
      ),
      encryptedName: uint8ToBase64(
        newGroupPrivateKeyring.encrypt(
          oldGroupPrivateKeyring.decrypt(base64ToBytes(inv.encryptedName), {
            padding: true,
          }),
          newGroupPublicKeyring,
          newGroupPublicKeyring,
          { padding: true },
        ),
      ),
    };
  }

  const groupJoinRequests: Out["groupJoinRequests"] = {};
  for (const [uid, jr] of Object.entries(b.groupJoinRequests)) {
    groupJoinRequests[uid] = {
      encryptedName: uint8ToBase64(
        newGroupPrivateKeyring.encrypt(
          oldGroupPrivateKeyring.decrypt(base64ToBytes(jr.encryptedName), {
            padding: true,
          }),
          newGroupPublicKeyring,
          newGroupPublicKeyring,
          { padding: true },
        ),
      ),
    };
  }

  const groupPages: Out["groupPages"] = {};
  for (const [pageId, pg] of Object.entries(b.groupPages)) {
    groupPages[pageId] = {
      encryptedSymmetricKeyring: uint8ToBase64(
        createSymmetricKeyring(base64ToBytes(pg.encryptedSymmetricKeyring))
          .unwrapSymmetric(oldGroupContentKeyring, {
            associatedData: {
              context: "PageKeyring",
              pageId,
            },
          })
          .wrapSymmetric(newGroupContentKeyring, {
            associatedData: {
              context: "PageKeyring",
              pageId,
            },
          }).wrappedValue,
      ),
    };
  }

  return {
    groupEncryptedName: uint8ToBase64(groupEncryptedNameOut),
    groupEncryptedContentKeyring: uint8ToBase64(groupEncryptedContentKeyringOut),
    groupPublicKeyring: uint8ToBase64(newGroupPublicKeyring.wrappedValue),
    groupEncryptedPrivateKeyring: uint8ToBase64(groupEncryptedPrivateKeyringOut),
    groupMembers,
    groupJoinInvitations,
    groupJoinRequests,
    groupPages,
  };
}
