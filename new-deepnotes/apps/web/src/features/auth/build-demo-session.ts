import sodium from "libsodium-wrappers-sumo";
import { nanoid } from "nanoid";

import type { components } from "../../api/api-types.generated";
import { uint8ToBase64 } from "./bytes";

type SessionDemoRequest = components["schemas"]["SessionDemoRequest"];

function rand32(): Uint8Array {
  return sodium.randombytes_buf(32);
}

/**
 * Random demo registration payload (parity with session integration tests / `POST /api/sessions/demo`).
 */
export async function buildSessionDemoRequest(): Promise<SessionDemoRequest> {
  await sodium.ready;

  const userId = nanoid();
  const groupId = nanoid();
  const pageId = nanoid();

  return {
    userId,
    groupId,
    pageId,
    userPublicKeyring: uint8ToBase64(rand32()),
    userEncryptedPrivateKeyring: uint8ToBase64(rand32()),
    userEncryptedSymmetricKeyring: uint8ToBase64(rand32()),
    userEncryptedName: uint8ToBase64(rand32()),
    userEncryptedDefaultNote: uint8ToBase64(rand32()),
    userEncryptedDefaultArrow: uint8ToBase64(rand32()),
    groupCreation: {
      groupEncryptedName: uint8ToBase64(rand32()),
      groupIsPublic: true,
      groupAccessKeyring: uint8ToBase64(rand32()),
      groupEncryptedInternalKeyring: uint8ToBase64(rand32()),
      groupEncryptedContentKeyring: uint8ToBase64(rand32()),
      groupPublicKeyring: uint8ToBase64(rand32()),
      groupEncryptedPrivateKeyring: uint8ToBase64(rand32()),
      groupOwnerEncryptedName: uint8ToBase64(rand32()),
    },
    pageCreation: {
      pageEncryptedSymmetricKeyring: uint8ToBase64(rand32()),
      pageEncryptedRelativeTitle: uint8ToBase64(rand32()),
      pageEncryptedAbsoluteTitle: uint8ToBase64(rand32()),
    },
  };
}
