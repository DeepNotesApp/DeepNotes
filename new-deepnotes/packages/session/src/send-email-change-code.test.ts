import { afterEach, describe, expect, it, vi } from "vitest";

import type { SessionEnv } from "@deepnotes/session-core";
import { sendEmailChangeVerificationEmail } from "@deepnotes/session-core";

function minimalEnv(
  overrides: Partial<Pick<SessionEnv, "SEND_EMAILS" | "RESEND_API_KEY">>,
): SessionEnv {
  return {
    ACCESS_SECRET: "a",
    REFRESH_SECRET: "b",
    USER_EMAIL_SECRET: "c",
    USER_EMAIL_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
    USER_REHASHED_LOGIN_HASH_ENCRYPTION_KEY: Buffer.alloc(32, 2).toString(
      "base64",
    ),
    USER_AUTHENTICATOR_SECRET_ENCRYPTION_KEY: Buffer.alloc(32, 3).toString(
      "base64",
    ),
    USER_RECOVERY_CODES_ENCRYPTION_KEY: Buffer.alloc(32, 4).toString("base64"),
    GROUP_REHASHED_PASSWORD_HASH_ENCRYPTION_KEY: Buffer.alloc(32, 5).toString(
      "base64",
    ),
    ...overrides,
  };
}

describe("sendEmailChangeVerificationEmail", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("no-ops when SEND_EMAILS is false (no Resend, no fetch)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await sendEmailChangeVerificationEmail({
      env: minimalEnv({ SEND_EMAILS: "false" }),
      toEmail: "u@x.co",
      emailVerificationCode: "123456",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("throws 503 when outbound email is enabled but RESEND_API_KEY is missing", async () => {
    await expect(
      sendEmailChangeVerificationEmail({
        env: minimalEnv({ SEND_EMAILS: "true", RESEND_API_KEY: undefined }),
        toEmail: "u@x.co",
        emailVerificationCode: "000000",
      }),
    ).rejects.toMatchObject({
      name: "SessionError",
      status: 503,
      code: "SERVICE_UNAVAILABLE",
    });
  });

  it("throws 503 when RESEND_API_KEY is whitespace only", async () => {
    await expect(
      sendEmailChangeVerificationEmail({
        env: minimalEnv({
          SEND_EMAILS: "true",
          RESEND_API_KEY: "   \t",
        }),
        toEmail: "u@x.co",
        emailVerificationCode: "000000",
      }),
    ).rejects.toMatchObject({ status: 503 });
  });

  it("throws 502 when Resend returns non-OK", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("bad", { status: 422 }),
    );
    await expect(
      sendEmailChangeVerificationEmail({
        env: minimalEnv({
          SEND_EMAILS: "true",
          RESEND_API_KEY: "re_test",
        }),
        toEmail: "u@x.co",
        emailVerificationCode: "654321",
      }),
    ).rejects.toMatchObject({
      status: 502,
      code: "EMAIL_SEND_FAILED",
    });
  });

  it("resolves when Resend returns OK", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 200 }));
    await expect(
      sendEmailChangeVerificationEmail({
        env: minimalEnv({
          SEND_EMAILS: "true",
          RESEND_API_KEY: "re_ok",
        }),
        toEmail: "user@example.com",
        emailVerificationCode: "111222",
      }),
    ).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer re_ok",
        }),
      }),
    );
  });
});
