import { computed, ref, type Ref } from "vue";

import { createDeepnotesApiClient } from "../../api/client";
import type { components } from "../../api/api-types.generated";
import { buildSessionDemoRequest } from "./build-demo-session";
import { loginPreimageFromPassword, uint8ToBase64 } from "./bytes";
import { readDocumentCookie } from "./cookies";
import {
  applyRefreshToStoredKeyrings,
  clearSessionCrypto,
  persistSessionKeyringsFromLogin,
} from "./session-keyrings";

export type UserMe = components["schemas"]["UserMeResponse"];
export type SessionErrorBody = components["schemas"]["SessionErrorResponse"];

const TWO_FACTOR_MESSAGE = "Requires two-factor authentication.";

const client = createDeepnotesApiClient();

const user: Ref<UserMe | null> = ref(null);
const loading: Ref<boolean> = ref(false);
const bootstrapped: Ref<boolean> = ref(false);
const lastError: Ref<string | null> = ref(null);
const twoFactorRequired: Ref<boolean> = ref(false);

let bootstrapInFlight: Promise<void> | null = null;

function setErrorFromBody(body: unknown, fallback: string) {
  if (
    body &&
    typeof body === "object" &&
    "message" in body &&
    typeof (body as SessionErrorBody).message === "string"
  ) {
    lastError.value = (body as SessionErrorBody).message;
    return;
  }
  lastError.value = fallback;
}

/**
 * Resets {@link useSession} module state between Vitest cases (singleton refs).
 */
export function resetSessionSingletonForTests(): void {
  user.value = null;
  loading.value = false;
  bootstrapped.value = false;
  lastError.value = null;
  twoFactorRequired.value = false;
  bootstrapInFlight = null;
}

export function useSession() {
  const isAuthenticated = computed(() => user.value != null);
  const loggedInHint = computed(
    () => readDocumentCookie("loggedIn") === "true",
  );

  async function fetchMe() {
    const { data, error, response } = await client.GET("/api/users/me", {});
    if (response.status === 200 && data) {
      user.value = data;
      return true;
    }
    if (error != null) {
      setErrorFromBody(error, "Could not load account.");
    }
    user.value = null;
    return false;
  }

  /**
   * If the `loggedIn` hint cookie is set, rotate refresh token then load `/me`.
   * Safe to call from multiple components; concurrent callers share one run.
   */
  async function bootstrap() {
    if (bootstrapped.value) {
      return;
    }
    if (bootstrapInFlight) {
      await bootstrapInFlight;
      return;
    }
    loading.value = true;
    lastError.value = null;
    bootstrapInFlight = (async () => {
      try {
        if (readDocumentCookie("loggedIn") !== "true") {
          user.value = null;
          return;
        }
        const refRes = await client.POST("/api/sessions/refresh", {});
        if (refRes.response.status === 401) {
          user.value = null;
          clearSessionCrypto();
          return;
        }
        if (refRes.error != null) {
          user.value = null;
          clearSessionCrypto();
          setErrorFromBody(
            refRes.error,
            "Session could not be refreshed. Try signing in again.",
          );
          return;
        }
        if (refRes.response.status === 200 && refRes.data) {
          await applyRefreshToStoredKeyrings({
            oldSessionKey: refRes.data.oldSessionKey,
            newSessionKey: refRes.data.newSessionKey,
          });
        }
        await fetchMe();
      } finally {
        loading.value = false;
        bootstrapped.value = true;
        bootstrapInFlight = null;
      }
    })();
    await bootstrapInFlight;
  }

  async function loginWithDemo() {
    loading.value = true;
    twoFactorRequired.value = false;
    lastError.value = null;
    try {
      const body = await buildSessionDemoRequest();
      const { data, error, response } = await client.POST(
        "/api/sessions/demo",
        { body },
      );
      if (response.status === 200 && data) {
        user.value = null;
        clearSessionCrypto();
        await fetchMe();
        return { ok: true as const };
      }
      if (error != null) {
        setErrorFromBody(error, "Demo session could not be created.");
      } else {
        lastError.value = "Demo session could not be created.";
      }
      return { ok: false as const };
    } finally {
      loading.value = false;
    }
  }

  async function loginWithPassword(input: {
    email: string;
    password: string;
    rememberSession: boolean;
    authenticatorToken?: string;
    recoveryCode?: string;
  }): Promise<{ ok: boolean; needTwoFactor: boolean }> {
    loading.value = true;
    if (!input.authenticatorToken && !input.recoveryCode) {
      twoFactorRequired.value = false;
    }
    lastError.value = null;
    const preimage = loginPreimageFromPassword(input.password);
    const body: components["schemas"]["SessionLoginRequest"] = {
      email: input.email.trim().toLowerCase(),
      loginHash: uint8ToBase64(preimage),
      rememberSession: input.rememberSession,
      ...(input.authenticatorToken
        ? { authenticatorToken: input.authenticatorToken }
        : {}),
      ...(input.recoveryCode ? { recoveryCode: input.recoveryCode } : {}),
    };
    try {
      const { data, error, response } = await client.POST(
        "/api/sessions/login",
        { body },
      );
      if (response.status === 200 && data) {
        twoFactorRequired.value = false;
        user.value = null;
        if (data.passwordSalt != null && data.passwordSalt !== "") {
          await persistSessionKeyringsFromLogin({
            login: data,
            password: input.password,
          });
        }
        await fetchMe();
        return { ok: true, needTwoFactor: false };
      }
      if (response.status === 401 && error) {
        setErrorFromBody(error, "Sign-in failed.");
        const errBody = error as SessionErrorBody;
        if (errBody.message === TWO_FACTOR_MESSAGE) {
          twoFactorRequired.value = true;
          return { ok: false, needTwoFactor: true };
        }
        return { ok: false, needTwoFactor: false };
      }
      if (error != null) {
        setErrorFromBody(error, "Sign-in failed.");
      } else {
        lastError.value = "Sign-in failed.";
      }
      return { ok: false, needTwoFactor: false };
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    loading.value = true;
    lastError.value = null;
    try {
      const { response } = await client.POST("/api/sessions/logout", {});
      if (response.status === 204) {
        user.value = null;
        twoFactorRequired.value = false;
        clearSessionCrypto();
      } else {
        lastError.value = "Sign out failed.";
      }
    } finally {
      loading.value = false;
    }
  }

  return {
    client,
    user,
    loading,
    bootstrapped,
    lastError,
    twoFactorRequired,
    isAuthenticated,
    loggedInHint,
    bootstrap,
    fetchMe,
    loginWithDemo,
    loginWithPassword,
    logout,
    clearError: () => {
      lastError.value = null;
    },
  };
}

export { TWO_FACTOR_MESSAGE };
