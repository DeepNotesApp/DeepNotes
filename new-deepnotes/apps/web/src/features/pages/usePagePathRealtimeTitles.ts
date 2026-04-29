import type { Ref } from "vue";
import { ref, watch } from "vue";

import { readSessionCrypto } from "../auth/crypto-storage";
import {
  ensureRealtimeUserWs,
  realtimeUserWsConnected,
  sendRealtimeRequestBatch,
  buildRealtimeHget,
  buildRealtimeSubscribe,
  buildRealtimeUnsubscribe,
  subscribeRealtimeHashField,
} from "../realtime/realtime-user-ws";
import {
  decryptPageAbsoluteTitle,
  unlockPageCollabSymmetricKeyring,
} from "./page-collab-crypto";

export type CollabGroupCryptoMaterial = {
  groupId: string;
  groupEncryptedContentKeyring: Uint8Array;
  memberEncryptedAccessKeyring: Uint8Array | null;
  groupAccessKeyring: Uint8Array | null;
};

function coerceRedisBytes(v: unknown): Uint8Array | null {
  if (v == null) {
    return null;
  }
  if (v instanceof Uint8Array) {
    return v;
  }
  if (v instanceof ArrayBuffer) {
    return new Uint8Array(v);
  }
  if (
    Array.isArray(v) &&
    v.every((x) => typeof x === "number" && Number.isFinite(x))
  ) {
    return Uint8Array.from(v as number[]);
  }
  return null;
}

function coerceGroupId(v: unknown): string | null {
  if (typeof v === "string" && v.length > 0) {
    return v;
  }
  return null;
}

/**
 * Legacy-style realtime Redis hashes for breadcrumb: HGET + SUBSCRIBE `page:{id}` `encrypted-absolute-title`
 * when `UserRealtimeRoom` has Upstash + Postgres ACL (`HYPERDRIVE`). Same-group path segments only.
 */
export function usePagePathRealtimeTitles(input: {
  pathPageIds: Ref<string[]>;
  collabGroupCrypto: Ref<CollabGroupCryptoMaterial | null>;
  bootstrapped: Ref<boolean>;
  isAuthenticated: Ref<boolean>;
  demo: Ref<boolean>;
  collabLoading: Ref<boolean>;
  cryptoError: Ref<string | null>;
}) {
  const pathPageLabels = ref<Record<string, string>>({});
  let watchGen = 0;
  let fieldUnsubs: Array<() => void> = [];
  let lastTitleSubs: string[] = [];

  watch(
    [
      () => input.pathPageIds.value,
      () => input.collabGroupCrypto.value,
      () => input.bootstrapped.value,
      () => input.isAuthenticated.value,
      () => input.demo.value,
      () => input.collabLoading.value,
      () => input.cryptoError.value,
      realtimeUserWsConnected,
    ],
    async () => {
      const gen = ++watchGen;

      if (
        realtimeUserWsConnected.value &&
        lastTitleSubs.length > 0
      ) {
        void sendRealtimeRequestBatch(
          lastTitleSubs.map((id) =>
            buildRealtimeUnsubscribe("page", id, "encrypted-absolute-title"),
          ),
        );
      }
      lastTitleSubs = [];

      for (const u of fieldUnsubs) {
        u();
      }
      fieldUnsubs = [];
      pathPageLabels.value = {};

      if (
        !input.bootstrapped.value ||
        !input.isAuthenticated.value ||
        input.demo.value ||
        input.collabLoading.value ||
        input.cryptoError.value != null
      ) {
        return;
      }

      const mat = input.collabGroupCrypto.value;
      if (mat == null) {
        return;
      }

      const ids = input.pathPageIds.value;
      if (ids.length === 0) {
        return;
      }

      ensureRealtimeUserWs({ demo: input.demo.value });
      if (!realtimeUserWsConnected.value) {
        return;
      }

      const stored = readSessionCrypto();
      if (stored == null) {
        return;
      }

      const gidRes = await sendRealtimeRequestBatch(
        ids.map((id) => buildRealtimeHget("page", id, "group-id")),
      );
      if (gen !== watchGen) {
        return;
      }

      const sameGroupIds: string[] = [];
      for (let i = 0; i < ids.length; i++) {
        const gid = coerceGroupId(gidRes.hgetValuesInOrder[i]);
        if (gid === mat.groupId) {
          sameGroupIds.push(ids[i]!);
        }
      }

      if (sameGroupIds.length === 0) {
        return;
      }

      const detailedCmds = sameGroupIds.flatMap((pageId) => [
        buildRealtimeHget("page", pageId, "encrypted-absolute-title"),
        buildRealtimeHget("page", pageId, "encrypted-symmetric-keyring"),
      ]);
      const det = await sendRealtimeRequestBatch(detailedCmds);
      if (gen !== watchGen) {
        return;
      }

      const next: Record<string, string> = {};

      for (let i = 0; i < sameGroupIds.length; i++) {
        const pageId = sameGroupIds[i]!;
        const encAbs = det.hgetValuesInOrder[i * 2];
        const encRing = det.hgetValuesInOrder[i * 2 + 1];
        const keyBytes = coerceRedisBytes(encRing);
        const titleBytes = coerceRedisBytes(encAbs);
        if (keyBytes == null || titleBytes == null) {
          continue;
        }
        try {
          const pageRing = await unlockPageCollabSymmetricKeyring({
            pageId,
            groupId: mat.groupId,
            pageEncryptedSymmetricKeyring: keyBytes,
            groupEncryptedContentKeyring: mat.groupEncryptedContentKeyring,
            memberEncryptedAccessKeyring: mat.memberEncryptedAccessKeyring,
            groupAccessKeyring: mat.groupAccessKeyring,
            stored,
          });
          next[pageId] = decryptPageAbsoluteTitle({
            pageKeyring: pageRing,
            pageId,
            ciphertext: titleBytes,
          });
        } catch {
          // ignore per-page decrypt failures
        }
      }

      if (gen !== watchGen) {
        return;
      }
      pathPageLabels.value = next;

      async function refreshTitleFromHash(
        pageId: string,
        encVal: unknown,
      ): Promise<void> {
        const bytesTitle = coerceRedisBytes(encVal);
        if (bytesTitle == null) {
          return;
        }
        const ringRes = await sendRealtimeRequestBatch([
          buildRealtimeHget("page", pageId, "encrypted-symmetric-keyring"),
        ]);
        if (gen !== watchGen) {
          return;
        }
        const kb = coerceRedisBytes(ringRes.hgetValuesInOrder[0]);
        if (kb == null) {
          return;
        }
        const storedNow = readSessionCrypto();
        if (storedNow == null) {
          return;
        }
        try {
          const matNow = input.collabGroupCrypto.value;
          if (matNow == null) {
            return;
          }
          const pageRing = await unlockPageCollabSymmetricKeyring({
            pageId,
            groupId: matNow.groupId,
            pageEncryptedSymmetricKeyring: kb,
            groupEncryptedContentKeyring: matNow.groupEncryptedContentKeyring,
            memberEncryptedAccessKeyring: matNow.memberEncryptedAccessKeyring,
            groupAccessKeyring: matNow.groupAccessKeyring,
            stored: storedNow,
          });
          const text = decryptPageAbsoluteTitle({
            pageKeyring: pageRing,
            pageId,
            ciphertext: bytesTitle,
          });
          if (gen !== watchGen) {
            return;
          }
          pathPageLabels.value = {
            ...pathPageLabels.value,
            [pageId]: text,
          };
        } catch {
          // ignore
        }
      }

      for (const pageId of sameGroupIds) {
        const unst = subscribeRealtimeHashField(
          "page",
          pageId,
          "encrypted-absolute-title",
          (v) => {
            void refreshTitleFromHash(pageId, v);
          },
        );
        fieldUnsubs.push(unst);
      }

      void sendRealtimeRequestBatch(
        sameGroupIds.map((id) =>
          buildRealtimeSubscribe("page", id, "encrypted-absolute-title"),
        ),
      );
      lastTitleSubs = [...sameGroupIds];
    },
    { flush: "post" },
  );

  return { pathPageLabels };
}
