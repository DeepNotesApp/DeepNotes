import {
  createSymmetricKeyring,
  type SymmetricKeyring,
  wrapSymmetricKey,
} from "@deepnotes/e2ee";
import * as Y from "yjs";

import { uint8ToBase64 } from "../auth/bytes";
import type { StoredSessionCrypto } from "../auth/crypto-storage";

import {
  decryptPageDocUpdate,
  encryptPageDocUpdate,
  unwrapGroupContentSymmetricKeyring,
} from "./page-collab-crypto";
import { decryptPageSnapshotPlainUpdate } from "./page-snapshot-crypto";

import type { components } from "@/api/api-types.generated";

export type CrossGroupMoveReencryptResult = NonNullable<
  components["schemas"]["PageMoveRequest"]["reencrypt"]
>;

function mergeEncryptedUpdatesIntoDoc(input: {
  pageId: string;
  pageKeyring: SymmetricKeyring;
  updates: { encryptedData: Uint8Array }[];
}): Y.Doc {
  const aux = new Y.Doc();
  aux.transact(() => {
    for (const u of input.updates) {
      try {
        const plain = decryptPageDocUpdate({
          pageKeyring: input.pageKeyring,
          pageId: input.pageId,
          ciphertext: u.encryptedData,
        });
        Y.applyUpdateV2(aux, plain);
      } catch {
        //
      }
    }
  });
  return aux;
}

/** Re-encrypt snapshot rows for `POST …/move` after a new page symmetric key is chosen. */
function reencryptSnapshotRow(input: {
  oldPageKeyring: SymmetricKeyring;
  newPageKeyring: SymmetricKeyring;
  pageId: string;
  encryptedSymmetricKeyB64: string | null | undefined;
  encryptedDataB64: string;
}): { encryptedSymmetricKey: string; encryptedData: string } {
  const plain = decryptPageSnapshotPlainUpdate({
    pageKeyring: input.oldPageKeyring,
    pageId: input.pageId,
    encryptedSymmetricKeyB64: input.encryptedSymmetricKeyB64,
    encryptedDataB64: input.encryptedDataB64,
  });
  const symmetricKey = wrapSymmetricKey();
  const encryptedSymmetricKey = uint8ToBase64(
    input.newPageKeyring.encrypt(symmetricKey.value, {
      associatedData: {
        context: "PageSnapshotSymmetricKey",
        pageId: input.pageId,
      },
    }),
  );
  const encryptedData = uint8ToBase64(
    symmetricKey.encrypt(plain, {
      padding: true,
      associatedData: {
        context: "PageSnapshotData",
        pageId: input.pageId,
      },
    }),
  );
  return { encryptedSymmetricKey, encryptedData };
}

/**
 * Build `reencrypt` for `POST /api/pages/{pageId}/move` when `destGroupId` ≠ source group (Pro).
 * Matches legacy `pages.move` step 2: new `SymmetricKeyring`, wrap with destination `GroupContentKeyring`,
 * merge Yjs updates, single index-0 ciphertext, re-key snapshot rows by id.
 */
export async function buildCrossGroupPageMoveReencrypt(input: {
  pageId: string;
  destGroupId: string;
  oldPageKeyring: SymmetricKeyring;
  pageEncryptedRelativeTitleB64: string;
  pageEncryptedAbsoluteTitleB64: string;
  collabUpdates: { encryptedData: Uint8Array }[];
  snapshotRows: { snapshotId: string; encryptedSymmetricKey: string | null; encryptedData: string }[];
  destGroupEncryptedContentKeyringB64: string;
  destGroupAccessKeyringB64: string | null;
  destMemberEncryptedAccessKeyringB64: string | null;
  stored: StoredSessionCrypto;
}): Promise<CrossGroupMoveReencryptResult> {
  const destGroupContentRaw = await unwrapGroupContentSymmetricKeyring({
    groupId: input.destGroupId,
    groupEncryptedContentKeyring: Uint8Array.from(
      Buffer.from(input.destGroupEncryptedContentKeyringB64, "base64"),
    ),
    memberEncryptedAccessKeyring:
      input.destMemberEncryptedAccessKeyringB64 != null &&
      input.destMemberEncryptedAccessKeyringB64 !== ""
        ? Uint8Array.from(
            Buffer.from(input.destMemberEncryptedAccessKeyringB64, "base64"),
          )
        : null,
    groupAccessKeyring:
      input.destGroupAccessKeyringB64 != null &&
      input.destGroupAccessKeyringB64 !== ""
        ? Uint8Array.from(
            Buffer.from(input.destGroupAccessKeyringB64, "base64"),
          )
        : null,
    stored: input.stored,
  });

  const newPageKeyring = createSymmetricKeyring();
  const pageEncryptedSymmetricKeyring = uint8ToBase64(
    newPageKeyring.wrapSymmetric(destGroupContentRaw, {
      associatedData: {
        context: "PageKeyring",
        pageId: input.pageId,
      },
    }).wrappedValue,
  );

  const relCipher = Uint8Array.from(
    Buffer.from(input.pageEncryptedRelativeTitleB64, "base64"),
  );
  const absCipher = Uint8Array.from(
    Buffer.from(input.pageEncryptedAbsoluteTitleB64, "base64"),
  );

  const pageEncryptedRelativeTitle = uint8ToBase64(
    newPageKeyring.encrypt(
      input.oldPageKeyring.decrypt(relCipher, {
        padding: true,
        associatedData: {
          context: "PageRelativeTitle",
          pageId: input.pageId,
        },
      }),
      {
        padding: true,
        associatedData: {
          context: "PageRelativeTitle",
          pageId: input.pageId,
        },
      },
    ),
  );

  const pageEncryptedAbsoluteTitle = uint8ToBase64(
    newPageKeyring.encrypt(
      input.oldPageKeyring.decrypt(absCipher, {
        padding: true,
        associatedData: {
          context: "PageAbsoluteTitle",
          pageId: input.pageId,
        },
      }),
      {
        padding: true,
        associatedData: {
          context: "PageAbsoluteTitle",
          pageId: input.pageId,
        },
      },
    ),
  );

  const auxDoc = mergeEncryptedUpdatesIntoDoc({
    pageId: input.pageId,
    pageKeyring: input.oldPageKeyring,
    updates: input.collabUpdates,
  });

  const merged = Y.encodeStateAsUpdateV2(auxDoc);
  auxDoc.destroy();

  const pageEncryptedUpdate = uint8ToBase64(
    encryptPageDocUpdate({
      pageKeyring: newPageKeyring,
      pageId: input.pageId,
      plaintext: merged,
    }),
  );

  const pageEncryptedSnapshots: CrossGroupMoveReencryptResult["pageEncryptedSnapshots"] =
    {};
  for (const s of input.snapshotRows) {
    pageEncryptedSnapshots[s.snapshotId] = reencryptSnapshotRow({
      oldPageKeyring: input.oldPageKeyring,
      newPageKeyring,
      pageId: input.pageId,
      encryptedSymmetricKeyB64: s.encryptedSymmetricKey,
      encryptedDataB64: s.encryptedData,
    });
  }

  return {
    pageEncryptedSymmetricKeyring,
    pageEncryptedRelativeTitle,
    pageEncryptedAbsoluteTitle,
    pageEncryptedUpdate,
    pageEncryptedSnapshots,
  };
}
