import type { ComputedRef, Ref } from "vue";
import { ref } from "vue";

import type { UserMe } from "../auth/useSession";
import { readSessionCrypto } from "../auth/crypto-storage";
import { unlockPageCollabSymmetricKeyring } from "./page-collab-crypto";

export function useCollabCrypto(opts: {
  pageId: ComputedRef<string>;
  user: Ref<UserMe | null>;
}) {
  const { pageId } = opts;

  const pageKeyring = ref<import("@deepnotes/e2ee").SymmetricKeyring | null>(null);
  const collabGroupCrypto = ref<{
    groupId: string;
    groupEncryptedContentKeyring: Uint8Array;
    memberEncryptedAccessKeyring: Uint8Array | null;
    groupAccessKeyring: Uint8Array | null;
  } | null>(null);
  const cryptoError = ref<string | null>(null);

  async function unlockKeyring(data: {
    groupId: string;
    pageEncryptedSymmetricKeyring: Uint8Array;
    groupEncryptedContentKeyring: Uint8Array;
    memberEncryptedAccessKeyring: Uint8Array | null;
    groupAccessKeyring: Uint8Array | null;
  }): Promise<boolean> {
    const id = pageId.value;
    if (!id) {
      return false;
    }
    const stored = readSessionCrypto();
    if (stored == null) {
      cryptoError.value =
        "Missing session crypto (sign out and sign in again with your password on this device).";
      return false;
    }
    try {
      pageKeyring.value = await unlockPageCollabSymmetricKeyring({
        pageId: id,
        groupId: data.groupId,
        pageEncryptedSymmetricKeyring: data.pageEncryptedSymmetricKeyring,
        groupEncryptedContentKeyring: data.groupEncryptedContentKeyring,
        memberEncryptedAccessKeyring: data.memberEncryptedAccessKeyring,
        groupAccessKeyring: data.groupAccessKeyring,
        stored,
      });
      collabGroupCrypto.value = {
        groupId: data.groupId,
        groupEncryptedContentKeyring: data.groupEncryptedContentKeyring,
        memberEncryptedAccessKeyring: data.memberEncryptedAccessKeyring,
        groupAccessKeyring: data.groupAccessKeyring,
      };
      return true;
    } catch (e) {
      cryptoError.value =
        e instanceof Error
          ? e.message
          : "Could not unlock page encryption keys.";
      return false;
    }
  }

  function clearCrypto() {
    pageKeyring.value = null;
    collabGroupCrypto.value = null;
    cryptoError.value = null;
  }

  return {
    pageKeyring,
    collabGroupCrypto,
    cryptoError,
    unlockKeyring,
    clearCrypto,
  };
}
