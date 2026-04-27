import {
  base64ToBytes,
  createPrivateKeyring,
  createSymmetricKeyring,
  DataLayer,
  ensureSodiumReady,
} from "@deepnotes/e2ee";
import { describe, expect, it } from "vitest";

import { buildUserRegisterRequest } from "./build-user-register";
import { loginPreimageFromPassword, uint8ToBase64 } from "./bytes";

describe("buildUserRegisterRequest", () => {
  it("sets email, loginHash, private personal group, and raw user keyrings", async () => {
    await ensureSodiumReady();
    const body = await buildUserRegisterRequest({
      email: "  User@Example.com ",
      password: "hunter2",
    });
    expect(body.email).toBe("user@example.com");
    expect(body.loginHash).toBe(
      uint8ToBase64(loginPreimageFromPassword("hunter2")),
    );
    expect(body.userId).toMatch(/^[A-Za-z0-9_-]{21}$/);
    expect(body.groupId).toMatch(/^[A-Za-z0-9_-]{21}$/);
    expect(body.pageId).toMatch(/^[A-Za-z0-9_-]{21}$/);
    expect(body.groupCreation.groupIsPublic).toBe(false);

    const priv = createPrivateKeyring(
      base64ToBytes(body.userEncryptedPrivateKeyring),
    );
    const sym = createSymmetricKeyring(
      base64ToBytes(body.userEncryptedSymmetricKeyring),
    );
    expect(priv.topLayer).toBe(DataLayer.Raw);
    expect(sym.topLayer).toBe(DataLayer.Raw);

    expect(body.userEncryptedPrivateKeyring.length).toBeGreaterThan(40);
    expect(body.groupCreation.groupAccessKeyring.length).toBeGreaterThan(40);
  });

  it("encrypts display name with UserName context", async () => {
    await ensureSodiumReady();
    const body = await buildUserRegisterRequest({
      email: "a@b.co",
      password: "x",
      displayName: "Ada",
    });
    const sym = createSymmetricKeyring(
      base64ToBytes(body.userEncryptedSymmetricKeyring),
    );
    const plain = sym.decrypt(base64ToBytes(body.userEncryptedName), {
      padding: true,
      associatedData: { context: "UserName", userId: body.userId },
    });
    expect(new TextDecoder().decode(plain)).toBe("Ada");
  });
});
