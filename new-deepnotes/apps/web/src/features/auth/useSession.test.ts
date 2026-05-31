import { beforeEach, describe, expect, it, vi } from "vitest";

const stubB64 = "dGVzdA==";
const stubB64b = "dGVzdGI=";

const userMe = {
  userId: "u_test",
  emailVerified: true,
  personalGroupId: "g_test",
};

const loginSuccessNoSalt = {
  userId: "u_test",
  sessionId: "ses_test",
  sessionKey: stubB64,
  personalGroupId: "g_test",
  publicKeyring: stubB64,
  encryptedPrivateKeyring: stubB64,
  encryptedSymmetricKeyring: stubB64,
};

const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  createDeepnotesApiClient: vi.fn(() => ({
    GET: mockGet,
    POST: mockPost,
  })),
}));

import {
  resetSessionSingletonForTests,
  TWO_FACTOR_MESSAGE,
  useSession,
} from "./useSession";

function okFetch<T>(status: number, data: T) {
  return Promise.resolve({
    data,
    error: undefined,
    response: { status } as Pick<Response, "status"> as Response,
  });
}

describe("useSession", () => {
  beforeEach(() => {
    resetSessionSingletonForTests();
    mockGet.mockReset();
    mockPost.mockReset();
    document.cookie = "";
  });

  it("loginWithPassword succeeds and loads /me (no passwordSalt skips keyring unwrap)", async () => {
    mockPost.mockImplementation((path: string) => {
      if (path === "/api/sessions/login") {
        return okFetch(200, loginSuccessNoSalt);
      }
      return okFetch(404, undefined as never);
    });
    mockGet.mockImplementation((path: string) => {
      if (path === "/api/users/me") return okFetch(200, userMe);
      return okFetch(404, undefined as never);
    });

    const { loginWithPassword, user, lastError } = useSession();
    const result = await loginWithPassword({
      email: "user@Example.com ",
      password: "secret",
      rememberSession: true,
    });

    expect(result).toEqual({ ok: true, needTwoFactor: false });
    expect(lastError.value).toBe(null);
    expect(user.value?.userId).toBe("u_test");
    expect(mockPost.mock.calls.some((c) => c[0] === "/api/sessions/login")).toBe(true);
    const loginBody = mockPost.mock.calls.find((c) => c[0] === "/api/sessions/login")?.[1] as {
      body: { email: string };
    };
    expect(loginBody.body.email).toBe("user@example.com");
  });

  it("loginWithPassword returns needTwoFactor on 401 with server 2FA message", async () => {
    mockPost.mockImplementation((path: string) => {
      if (path === "/api/sessions/login") {
        return Promise.resolve({
          data: undefined,
          error: {
            code: "UNAUTHORIZED",
            message: TWO_FACTOR_MESSAGE,
          },
          response: { status: 401 } as Pick<Response, "status"> as Response,
        });
      }
      return okFetch(404, undefined as never);
    });

    const { loginWithPassword, lastError, twoFactorRequired } = useSession();
    const result = await loginWithPassword({
      email: "a@b.co",
      password: "x",
      rememberSession: false,
    });

    expect(result).toEqual({ ok: false, needTwoFactor: true });
    expect(twoFactorRequired.value).toBe(true);
    expect(lastError.value).toBe(TWO_FACTOR_MESSAGE);
  });

  it("logout clears user on 204", async () => {
    mockPost.mockImplementation((path: string) => {
      if (path === "/api/sessions/login") {
        return okFetch(200, loginSuccessNoSalt);
      }
      if (path === "/api/sessions/logout") {
        return Promise.resolve({
          data: undefined,
          error: undefined,
          response: { status: 204 } as Pick<Response, "status"> as Response,
        });
      }
      return okFetch(404, undefined as never);
    });
    mockGet.mockImplementation((path: string) => {
      if (path === "/api/users/me") return okFetch(200, userMe);
      return okFetch(404, undefined as never);
    });

    const { loginWithPassword, logout, user } = useSession();
    await loginWithPassword({
      email: "z@z.co",
      password: "pw",
      rememberSession: false,
    });
    expect(user.value).not.toBe(null);

    await logout();
    expect(user.value).toBe(null);
  });

  it("bootstrap does not call refresh when loggedIn cookie is absent", async () => {
    const { bootstrap, bootstrapped, user } = useSession();
    await bootstrap();
    expect(mockPost.mock.calls.map((c) => c[0])).not.toContain("/api/sessions/refresh");
    expect(user.value).toBe(null);
    expect(bootstrapped.value).toBe(true);
  });

  it("bootstrap refreshes then loads /me when loggedIn cookie is set", async () => {
    document.cookie = "loggedIn=true";

    mockPost.mockImplementation((path: string) => {
      if (path === "/api/sessions/refresh") {
        return okFetch(200, { oldSessionKey: stubB64, newSessionKey: stubB64b });
      }
      return okFetch(404, undefined as never);
    });
    mockGet.mockImplementation((path: string) => {
      if (path === "/api/users/me") return okFetch(200, userMe);
      return okFetch(404, undefined as never);
    });

    const { bootstrap, user } = useSession();
    await bootstrap();

    expect(mockPost.mock.calls.map((c) => c[0])).toContain("/api/sessions/refresh");
    expect(user.value?.userId).toBe("u_test");
  });
});
