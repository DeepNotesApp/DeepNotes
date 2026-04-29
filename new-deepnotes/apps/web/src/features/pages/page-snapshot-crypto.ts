import {
  base64ToBytes,
  wrapSymmetricKey,
  type SymmetricKeyring,
} from "@deepnotes/e2ee";
import * as Y from "yjs";

import { uint8ToBase64 } from "../auth/bytes";

/** Clears ProseMirror + legacy text fragments, then applies a full-doc Yjs v2 update (legacy snapshot shape). */
export function applyYjsFullStateSnapshot(input: {
  ydoc: Y.Doc;
  proseField: string;
  legacyTextName: string;
  update: Uint8Array;
}): void {
  input.ydoc.transact(() => {
    const frag = input.ydoc.getXmlFragment(input.proseField);
    while (frag.length > 0) {
      frag.delete(frag.length - 1, 1);
    }
    const legacy = input.ydoc.getText(input.legacyTextName);
    if (legacy.length > 0) {
      legacy.delete(0, legacy.length);
    }
  });
  Y.applyUpdateV2(input.ydoc, input.update);
}

/** Legacy `savePageSnapshot` ciphertext (Pro). */
export function buildPageSnapshotSaveBodies(input: {
  pageKeyring: SymmetricKeyring;
  pageId: string;
  ydoc: Y.Doc;
}): { encryptedSymmetricKey: string; encryptedData: string } {
  const symmetricKey = wrapSymmetricKey();
  const encryptedSymmetricKey = uint8ToBase64(
    input.pageKeyring.encrypt(symmetricKey.value, {
      associatedData: {
        context: "PageSnapshotSymmetricKey",
        pageId: input.pageId,
      },
    }),
  );
  const encryptedData = uint8ToBase64(
    symmetricKey.encrypt(Y.encodeStateAsUpdateV2(input.ydoc), {
      padding: true,
      associatedData: {
        context: "PageSnapshotData",
        pageId: input.pageId,
      },
    }),
  );
  return { encryptedSymmetricKey, encryptedData };
}

export function decryptPageSnapshotPlainUpdate(input: {
  pageKeyring: SymmetricKeyring;
  pageId: string;
  encryptedSymmetricKeyB64: string | null | undefined;
  encryptedDataB64: string;
}): Uint8Array {
  const encSym = input.encryptedSymmetricKeyB64;
  if (encSym == null || encSym === "") {
    throw new Error("Snapshot is missing encrypted symmetric key.");
  }
  const symmetricRaw = input.pageKeyring.decrypt(base64ToBytes(encSym), {
    associatedData: {
      context: "PageSnapshotSymmetricKey",
      pageId: input.pageId,
    },
  });
  const snapshotSymmetric = wrapSymmetricKey(symmetricRaw);
  return snapshotSymmetric.decrypt(base64ToBytes(input.encryptedDataB64), {
    padding: true,
    associatedData: {
      context: "PageSnapshotData",
      pageId: input.pageId,
    },
  });
}
