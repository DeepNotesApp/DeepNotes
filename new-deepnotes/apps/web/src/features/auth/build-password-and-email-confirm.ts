import { ensureSodiumReady } from "@deepnotes/e2ee";

import type { components } from "../../api/api-types.generated";
import { loginPreimageFromPassword, uint8ToBase64 } from "./bytes";
import { extractRawUserKeyringsBase64FromSession } from "./session-keyrings";

export type UserPasswordChangeRequest =
  components["schemas"]["UserPasswordChangeRequest"];
export type UserEmailChangeConfirmRequest =
  components["schemas"]["UserEmailChangeConfirmRequest"];

function requireSessionKeyringsMessage(): string {
  return "No keyrings in this browser session. Sign in with email and password (not demo) to use this action.";
}

export async function buildPasswordChangePayload(input: {
  oldPassword: string;
  newPassword: string;
}): Promise<UserPasswordChangeRequest> {
  await ensureSodiumReady();
  const raw = await extractRawUserKeyringsBase64FromSession();
  if (raw == null) {
    throw new Error(requireSessionKeyringsMessage());
  }

  const oldPreimage = loginPreimageFromPassword(input.oldPassword);
  const newPreimage = loginPreimageFromPassword(input.newPassword);

  return {
    oldLoginHash: uint8ToBase64(oldPreimage),
    newLoginHash: uint8ToBase64(newPreimage),
    userEncryptedPrivateKeyring: raw.userEncryptedPrivateKeyring,
    userEncryptedSymmetricKeyring: raw.userEncryptedSymmetricKeyring,
  };
}

export async function buildEmailChangeConfirmPayload(input: {
  currentPassword: string;
  newPasswordAfterChange: string;
  emailVerificationCode: string;
}): Promise<UserEmailChangeConfirmRequest> {
  await ensureSodiumReady();
  const raw = await extractRawUserKeyringsBase64FromSession();
  if (raw == null) {
    throw new Error(requireSessionKeyringsMessage());
  }

  const oldPreimage = loginPreimageFromPassword(input.currentPassword);
  const newPreimage = loginPreimageFromPassword(input.newPasswordAfterChange);

  return {
    oldLoginHash: uint8ToBase64(oldPreimage),
    emailVerificationCode: input.emailVerificationCode.trim(),
    newLoginHash: uint8ToBase64(newPreimage),
    userEncryptedPrivateKeyring: raw.userEncryptedPrivateKeyring,
    userEncryptedSymmetricKeyring: raw.userEncryptedSymmetricKeyring,
  };
}
