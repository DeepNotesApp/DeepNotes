import {
  base64ToBytes,
  createKeyring,
  createSymmetricKeyring,
  createPrivateKeyring,
  DataLayer,
  ensureSodiumReady,
  wrapKeyPair,
  wrapSymmetricKey,
  type SymmetricKeyring,
} from "@deepnotes/e2ee";

import type { StoredSessionCrypto } from "../auth/crypto-storage";

function pickAccessKeyringBytes(input: {
  member: Uint8Array | null;
  group: Uint8Array | null;
}): Uint8Array {
  if (input.member != null && input.member.byteLength > 0) {
    return input.member;
  }
  if (input.group != null && input.group.byteLength > 0) {
    return input.group;
  }
  throw new Error("No group access key material for this page.");
}

/**
 * Unwrap `pages.encrypted_symmetric_keyring` using group content + access keyrings
 * (legacy `PageKeyring` + `GroupContentKeyring` contexts).
 */
export async function unlockPageCollabSymmetricKeyring(input: {
  pageId: string;
  groupId: string;
  pageEncryptedSymmetricKeyring: Uint8Array;
  groupEncryptedContentKeyring: Uint8Array;
  memberEncryptedAccessKeyring: Uint8Array | null;
  groupAccessKeyring: Uint8Array | null;
  stored: StoredSessionCrypto;
}): Promise<SymmetricKeyring> {
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

  const accessBytes = pickAccessKeyringBytes({
    member: input.memberEncryptedAccessKeyring,
    group: input.groupAccessKeyring,
  });

  let accessRing = createSymmetricKeyring(accessBytes);
  if (accessRing.topLayer === DataLayer.Asymmetric) {
    accessRing = accessRing.unwrapAsymmetric(keyPair.privateKey);
  }
  if (accessRing.topLayer !== DataLayer.Raw) {
    throw new Error(
      "Group access keyring is still locked (e.g. group password). Unlock is not implemented in the web MVP.",
    );
  }

  let groupContent = createSymmetricKeyring(input.groupEncryptedContentKeyring);
  if (groupContent.topLayer === DataLayer.Symmetric) {
    groupContent = groupContent.unwrapSymmetric(accessRing, {
      associatedData: {
        context: "GroupContentKeyring",
        groupId: input.groupId,
      },
    });
  }
  if (groupContent.topLayer !== DataLayer.Raw) {
    throw new Error(
      "Group content keyring could not be fully unwrapped (password-protected group?).",
    );
  }

  let pageRing = createSymmetricKeyring(input.pageEncryptedSymmetricKeyring);
  if (pageRing.topLayer === DataLayer.Symmetric) {
    pageRing = pageRing.unwrapSymmetric(groupContent, {
      associatedData: {
        context: "PageKeyring",
        pageId: input.pageId,
      },
    });
  }
  if (pageRing.topLayer !== DataLayer.Raw) {
    throw new Error("Page symmetric keyring could not be unwrapped.");
  }
  return pageRing;
}

/**
 * Unwrap `groups.encrypted_content_keyring` to raw symmetric material (legacy `GroupContentKeyring` context).
 */
export async function unwrapGroupContentSymmetricKeyring(input: {
  groupId: string;
  groupEncryptedContentKeyring: Uint8Array;
  memberEncryptedAccessKeyring: Uint8Array | null;
  groupAccessKeyring: Uint8Array | null;
  stored: StoredSessionCrypto;
}): Promise<SymmetricKeyring> {
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

  const accessBytes = pickAccessKeyringBytes({
    member: input.memberEncryptedAccessKeyring,
    group: input.groupAccessKeyring,
  });

  let accessRing = createSymmetricKeyring(accessBytes);
  if (accessRing.topLayer === DataLayer.Asymmetric) {
    accessRing = accessRing.unwrapAsymmetric(keyPair.privateKey);
  }
  if (accessRing.topLayer !== DataLayer.Raw) {
    throw new Error(
      "Group access keyring is still locked (e.g. group password). Unlock is not implemented in the web MVP.",
    );
  }

  let groupContent = createSymmetricKeyring(input.groupEncryptedContentKeyring);
  if (groupContent.topLayer === DataLayer.Symmetric) {
    groupContent = groupContent.unwrapSymmetric(accessRing, {
      associatedData: {
        context: "GroupContentKeyring",
        groupId: input.groupId,
      },
    });
  }
  if (groupContent.topLayer !== DataLayer.Raw) {
    throw new Error(
      "Group content keyring could not be fully unwrapped (password-protected group?).",
    );
  }
  return groupContent;
}

export function decryptPageDocUpdate(input: {
  pageKeyring: SymmetricKeyring;
  pageId: string;
  ciphertext: Uint8Array;
}): Uint8Array {
  return input.pageKeyring.decrypt(input.ciphertext, {
    padding: true,
    associatedData: {
      context: "PageDocUpdate",
      pageId: input.pageId,
    },
  });
}

export function encryptPageDocUpdate(input: {
  pageKeyring: SymmetricKeyring;
  pageId: string;
  plaintext: Uint8Array;
}): Uint8Array {
  return input.pageKeyring.encrypt(input.plaintext, {
    padding: true,
    associatedData: {
      context: "PageDocUpdate",
      pageId: input.pageId,
    },
  });
}
