import type { DeepnotesDb } from "@deepnotes/db/client";
import { groupMembers, groups } from "@deepnotes/db/schema";

import {
  computeGroupPasswordPhc,
  encryptGroupRehashedPasswordHash,
} from "./crypto/session-crypto.js";
import type { SessionEnv } from "./env.js";

function toBuf(u: Uint8Array): Buffer {
  return Buffer.from(u);
}

export type GroupCreationCiphertext = {
  groupEncryptedName: Uint8Array;
  groupPasswordHash?: Uint8Array;
  groupIsPublic: boolean;
  groupAccessKeyring: Uint8Array;
  groupEncryptedInternalKeyring: Uint8Array;
  groupEncryptedContentKeyring: Uint8Array;
  groupPublicKeyring: Uint8Array;
  groupEncryptedPrivateKeyring: Uint8Array;
  groupOwnerEncryptedName: Uint8Array;
};

type Tx = Parameters<Parameters<DeepnotesDb["transaction"]>[0]>[0];

/**
 * Inserts a non-personal `groups` row + owner `group_members` (legacy `createGroup`
 * with `groupIsPersonal: false`, same cipher shape as `pages.move` groupCreation).
 */
export async function insertSharedGroupForOwnerInTx(
  tx: Tx,
  input: {
    env: SessionEnv;
    userId: string;
    groupId: string;
    mainPageId: string;
    groupCreation: GroupCreationCiphertext;
  },
): Promise<void> {
  const g = input.groupCreation;
  let encryptedRehashed: Buffer | undefined;
  if (g.groupPasswordHash != null && g.groupPasswordHash.byteLength > 0) {
    const phc = computeGroupPasswordPhc(g.groupPasswordHash);
    const enc = encryptGroupRehashedPasswordHash(
      phc,
      input.env.GROUP_REHASHED_PASSWORD_HASH_ENCRYPTION_KEY,
    );
    encryptedRehashed = Buffer.from(enc);
  }
  await tx.insert(groups).values({
    id: input.groupId,
    mainPageId: input.mainPageId,
    encryptedName: toBuf(g.groupEncryptedName),
    userId: null,
    publicKeyring: toBuf(g.groupPublicKeyring),
    encryptedPrivateKeyring: toBuf(g.groupEncryptedPrivateKeyring),
    encryptedContentKeyring: toBuf(g.groupEncryptedContentKeyring),
    accessKeyring: g.groupIsPublic ? toBuf(g.groupAccessKeyring) : null,
    encryptedRehashedPasswordHash: encryptedRehashed,
  });
  await tx.insert(groupMembers).values({
    groupId: input.groupId,
    userId: input.userId,
    role: "owner",
    encryptedAccessKeyring: g.groupIsPublic ? null : toBuf(g.groupAccessKeyring),
    encryptedInternalKeyring: toBuf(g.groupEncryptedInternalKeyring),
    encryptedName: toBuf(g.groupOwnerEncryptedName),
  });
}
