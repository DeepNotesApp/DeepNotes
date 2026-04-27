import { describe, expect, it } from "vitest";

import { buildUserRegisterRequest } from "./build-user-register";
import { loginPreimageFromPassword, uint8ToBase64 } from "./bytes";

describe("buildUserRegisterRequest", () => {
  it("sets email, loginHash from UTF-8 password preimage, and demo-shaped fields", async () => {
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
    expect(body.groupCreation.groupIsPublic).toBe(true);
  });
});
