import {
  base64ToBytes,
  createKeyring,
  createPrivateKeyring,
  createSymmetricKeyring,
  DataLayer,
  deriveGroupPasswordValues,
  ensureSodiumReady,
  wrapKeyPair,
  wrapSymmetricKey,
} from "@deepnotes/e2ee";

import { uint8ToBase64 } from "../auth/bytes";
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
  throw new Error("No group access key material.");
}

async function unlockAccessKeyring(input: {
  memberEncryptedAccessKeyring: Uint8Array | null;
  groupAccessKeyring: Uint8Array | null;
  stored: StoredSessionCrypto;
}) {
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
      "Group access keyring is still locked (e.g. group password).",
    );
  }
  return accessRing;
}

export async function buildGroupPasswordEnableRequestBody(input: {
  groupId: string;
  password: string;
  groupEncryptedContentKeyring: Uint8Array;
  memberEncryptedAccessKeyring: Uint8Array | null;
  groupAccessKeyring: Uint8Array | null;
  stored: StoredSessionCrypto;
}): Promise<{
  groupPasswordHash: string;
  groupEncryptedContentKeyring: string;
}> {
  await ensureSodiumReady();
  const { passwordHash, passwordKey } = deriveGroupPasswordValues(
    input.groupId,
    input.password,
  );

  const accessRing = await unlockAccessKeyring({
    memberEncryptedAccessKeyring: input.memberEncryptedAccessKeyring,
    groupAccessKeyring: input.groupAccessKeyring,
    stored: input.stored,
  });

  let rawContent = createSymmetricKeyring(input.groupEncryptedContentKeyring);
  if (rawContent.topLayer === DataLayer.Symmetric) {
    rawContent = rawContent.unwrapSymmetric(accessRing, {
      associatedData: {
        context: "GroupContentKeyring",
        groupId: input.groupId,
      },
    });
  }
  if (rawContent.topLayer !== DataLayer.Raw) {
    throw new Error(
      "Group content keyring is already password-protected or corrupted.",
    );
  }

  const passwordWrapped = rawContent.wrapSymmetric(passwordKey, {
    associatedData: {
      context: "GroupContentKeyringPasswordProtection",
      groupId: input.groupId,
    },
  });

  const final = passwordWrapped.wrapSymmetric(accessRing, {
    associatedData: {
      context: "GroupContentKeyring",
      groupId: input.groupId,
    },
  });

  return {
    groupPasswordHash: uint8ToBase64(passwordHash),
    groupEncryptedContentKeyring: uint8ToBase64(final.wrappedValue),
  };
}

export async function buildGroupPasswordChangeRequestBody(input: {
  groupId: string;
  currentPassword: string;
  newPassword: string;
  groupEncryptedContentKeyring: Uint8Array;
  memberEncryptedAccessKeyring: Uint8Array | null;
  groupAccessKeyring: Uint8Array | null;
  stored: StoredSessionCrypto;
}): Promise<{
  groupCurrentPasswordHash: string;
  groupNewPasswordHash: string;
  groupEncryptedContentKeyring: string;
}> {
  await ensureSodiumReady();
  const { passwordHash: currentHash, passwordKey: currentKey } =
    deriveGroupPasswordValues(input.groupId, input.currentPassword);
  const { passwordHash: newHash, passwordKey: newKey } =
    deriveGroupPasswordValues(input.groupId, input.newPassword);

  const accessRing = await unlockAccessKeyring({
    memberEncryptedAccessKeyring: input.memberEncryptedAccessKeyring,
    groupAccessKeyring: input.groupAccessKeyring,
    stored: input.stored,
  });

  let rawContent = createSymmetricKeyring(input.groupEncryptedContentKeyring);
  if (rawContent.topLayer === DataLayer.Symmetric) {
    rawContent = rawContent.unwrapSymmetric(accessRing, {
      associatedData: {
        context: "GroupContentKeyring",
        groupId: input.groupId,
      },
    });
  }
  if (rawContent.topLayer === DataLayer.Symmetric) {
    rawContent = rawContent.unwrapSymmetric(currentKey, {
      associatedData: {
        context: "GroupContentKeyringPasswordProtection",
        groupId: input.groupId,
      },
    });
  }
  if (rawContent.topLayer !== DataLayer.Raw) {
    throw new Error(
      "Group content keyring could not be unwrapped with current password.",
    );
  }

  const passwordWrapped = rawContent.wrapSymmetric(newKey, {
    associatedData: {
      context: "GroupContentKeyringPasswordProtection",
      groupId: input.groupId,
    },
  });

  const final = passwordWrapped.wrapSymmetric(accessRing, {
    associatedData: {
      context: "GroupContentKeyring",
      groupId: input.groupId,
    },
  });

  return {
    groupCurrentPasswordHash: uint8ToBase64(currentHash),
    groupNewPasswordHash: uint8ToBase64(newHash),
    groupEncryptedContentKeyring: uint8ToBase64(final.wrappedValue),
  };
}

export async function buildGroupPasswordDisableRequestBody(input: {
  groupId: string;
  currentPassword: string;
  groupEncryptedContentKeyring: Uint8Array;
  memberEncryptedAccessKeyring: Uint8Array | null;
  groupAccessKeyring: Uint8Array | null;
  stored: StoredSessionCrypto;
}): Promise<{
  groupPasswordHash: string;
  groupEncryptedContentKeyring: string;
}> {
  await ensureSodiumReady();
  const { passwordHash, passwordKey } = deriveGroupPasswordValues(
    input.groupId,
    input.currentPassword,
  );

  const accessRing = await unlockAccessKeyring({
    memberEncryptedAccessKeyring: input.memberEncryptedAccessKeyring,
    groupAccessKeyring: input.groupAccessKeyring,
    stored: input.stored,
  });

  let rawContent = createSymmetricKeyring(input.groupEncryptedContentKeyring);
  if (rawContent.topLayer === DataLayer.Symmetric) {
    rawContent = rawContent.unwrapSymmetric(accessRing, {
      associatedData: {
        context: "GroupContentKeyring",
        groupId: input.groupId,
      },
    });
  }
  if (rawContent.topLayer === DataLayer.Symmetric) {
    rawContent = rawContent.unwrapSymmetric(passwordKey, {
      associatedData: {
        context: "GroupContentKeyringPasswordProtection",
        groupId: input.groupId,
      },
    });
  }
  if (rawContent.topLayer !== DataLayer.Raw) {
    throw new Error(
      "Group content keyring could not be unwrapped with current password.",
    );
  }

  const final = rawContent.wrapSymmetric(accessRing, {
    associatedData: {
      context: "GroupContentKeyring",
      groupId: input.groupId,
    },
  });

  return {
    groupPasswordHash: uint8ToBase64(passwordHash),
    groupEncryptedContentKeyring: uint8ToBase64(final.wrappedValue),
  };
}
