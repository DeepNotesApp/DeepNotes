import {
  createKeyring,
  createPrivateKeyring,
  createSymmetricKeyring,
  ensureSodiumReady,
  wrapKeyPair,
  type KeyPair,
  generateKeyPair,
} from "@deepnotes/e2ee";
import { pack } from "msgpackr";
import { nanoid } from "nanoid";

import type { components } from "../../api/api-types.generated";
import { loginPreimageFromPassword, uint8ToBase64 } from "./bytes";

export type UserRegisterRequest = components["schemas"]["UserRegisterRequest"];

function textToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function defaultNotePacked(): Uint8Array {
  return pack({
    root: { noteIdxs: [0] },
    notes: [{ anchor: { y: 0 } }],
  });
}

function defaultArrowPacked(): Uint8Array {
  return pack({ color: "sky" });
}

/**
 * Personal group matching legacy `getRegistrationValues` (private group, empty names).
 */
function buildPersonalGroupCreation(input: {
  userKeyPair: KeyPair;
  groupId: string;
}): UserRegisterRequest["groupCreation"] {
  const accessKeyring = createSymmetricKeyring();
  const internalKeyring = createSymmetricKeyring();
  const contentKeyring = createSymmetricKeyring();

  const rawGroupKeys = generateKeyPair();
  const groupPublicRing = createKeyring(rawGroupKeys.publicKey);
  const groupPrivateRing = createPrivateKeyring(rawGroupKeys.privateKey);

  const encryptedInternalKeyring = internalKeyring.wrapAsymmetric(
    input.userKeyPair,
    input.userKeyPair.publicKey,
  );

  const encryptedContentKeyring = contentKeyring.wrapSymmetric(
    accessKeyring.topKey,
    {
      associatedData: {
        context: "GroupContentKeyring",
        groupId: input.groupId,
      },
    },
  );

  const encryptedGroupPrivateKeyring = groupPrivateRing.wrapSymmetric(
    internalKeyring.topKey,
    {
      associatedData: {
        context: "GroupPrivateKeyring",
        groupId: input.groupId,
      },
    },
  );

  const finalAccessKeyring = accessKeyring.wrapAsymmetric(
    input.userKeyPair,
    input.userKeyPair.publicKey,
  );

  return {
    groupEncryptedName: uint8ToBase64(new Uint8Array()),
    groupIsPublic: false,
    groupAccessKeyring: uint8ToBase64(finalAccessKeyring.wrappedValue),
    groupEncryptedInternalKeyring: uint8ToBase64(
      encryptedInternalKeyring.wrappedValue,
    ),
    groupEncryptedContentKeyring: uint8ToBase64(
      encryptedContentKeyring.wrappedValue,
    ),
    groupPublicKeyring: uint8ToBase64(groupPublicRing.wrappedValue),
    groupEncryptedPrivateKeyring: uint8ToBase64(
      encryptedGroupPrivateKeyring.wrappedValue,
    ),
    groupOwnerEncryptedName: uint8ToBase64(new Uint8Array()),
  };
}

/**
 * Build `POST /api/users` body: real libsodium keyrings and legacy-shaped defaults.
 * Inner user keyrings are **raw** (password layer is applied only server-side); the API worker wraps them
 * with `UserEncrypted*` using the password-derived key (see `performUserRegister`).
 */
export async function buildUserRegisterRequest(input: {
  email: string;
  password: string;
  /** Plaintext display name; defaults to empty (legacy allows empty `userEncryptedName`). */
  displayName?: string;
}): Promise<UserRegisterRequest> {
  await ensureSodiumReady();

  const email = input.email.trim().toLowerCase();
  const preimage = loginPreimageFromPassword(input.password);
  const userId = nanoid();
  const groupId = nanoid();
  const pageId = nanoid();
  const displayName = input.displayName ?? "";

  const rawUserKeys = generateKeyPair();
  const userPublicKeyring = createKeyring(rawUserKeys.publicKey);
  const userPrivateKeyring = createPrivateKeyring(rawUserKeys.privateKey);
  const userKeyPair = wrapKeyPair(userPublicKeyring, userPrivateKeyring);

  const userSymmetricKeyring = createSymmetricKeyring();

  const groupCreation = buildPersonalGroupCreation({ userKeyPair, groupId });

  const pageKeyring = createSymmetricKeyring();

  return {
    userId,
    groupId,
    pageId,
    email,
    loginHash: uint8ToBase64(preimage),
    userPublicKeyring: uint8ToBase64(userPublicKeyring.wrappedValue),
    userEncryptedPrivateKeyring: uint8ToBase64(userPrivateKeyring.wrappedValue),
    userEncryptedSymmetricKeyring: uint8ToBase64(
      userSymmetricKeyring.wrappedValue,
    ),
    userEncryptedName: uint8ToBase64(
      userSymmetricKeyring.encrypt(textToBytes(displayName), {
        padding: true,
        associatedData: {
          context: "UserName",
          userId,
        },
      }),
    ),
    userEncryptedDefaultNote: uint8ToBase64(
      userSymmetricKeyring.encrypt(defaultNotePacked(), {
        padding: true,
        associatedData: {
          context: "UserDefaultNote",
          userId,
        },
      }),
    ),
    userEncryptedDefaultArrow: uint8ToBase64(
      userSymmetricKeyring.encrypt(defaultArrowPacked(), {
        padding: true,
        associatedData: {
          context: "UserDefaultArrow",
          userId,
        },
      }),
    ),
    groupCreation,
    pageCreation: {
      pageEncryptedSymmetricKeyring: uint8ToBase64(pageKeyring.wrappedValue),
      pageEncryptedRelativeTitle: uint8ToBase64(
        pageKeyring.encrypt(textToBytes("Main page"), {
          padding: true,
          associatedData: {
            context: "PageRelativeTitle",
            pageId,
          },
        }),
      ),
      pageEncryptedAbsoluteTitle: uint8ToBase64(
        pageKeyring.encrypt(textToBytes(""), {
          padding: true,
          associatedData: {
            context: "PageAbsoluteTitle",
            pageId,
          },
        }),
      ),
    },
  };
}
