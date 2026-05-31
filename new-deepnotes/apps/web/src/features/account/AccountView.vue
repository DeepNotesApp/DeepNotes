<script setup lang="ts">
import { ref, watch } from "vue";
import { RouterLink, useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { components } from "../../api/api-types.generated";
import {
  buildEmailChangeConfirmPayload,
  buildPasswordChangePayload,
} from "../auth/build-password-and-email-confirm";
import { loginPreimageFromPassword, uint8ToBase64 } from "../auth/bytes";
import { clearSessionCrypto } from "../auth/crypto-storage";
import { useSession } from "../auth/useSession";

const router = useRouter();
const { client, user, bootstrapped, isAuthenticated, loading, fetchMe } =
  useSession();

watch(
  [bootstrapped, isAuthenticated],
  async () => {
    if (!bootstrapped.value) {
      return;
    }
    if (!isAuthenticated.value) {
      void router.replace({
        name: "login",
        query: { redirect: "/account" },
      });
    } else if (user.value == null) {
      await fetchMe();
    }
  },
  { immediate: true },
);

const stripeBusy = ref(false);
const stripeError = ref<string | null>(null);

async function stripeCheckout(
  freq: NonNullable<
    components["schemas"]["StripeCheckoutSessionRequest"]["billingFrequency"]
  >,
) {
  stripeError.value = null;
  stripeBusy.value = true;
  try {
    const res = await client.POST("/api/billing/stripe/checkout-session", {
      body: { billingFrequency: freq },
    });
    if (res.response.status !== 200 || !res.data?.checkoutSessionUrl) {
      stripeError.value =
        messageFromMaybeError(res.error) ?? "Checkout could not be started.";
      return;
    }
    window.location.assign(res.data.checkoutSessionUrl);
  } finally {
    stripeBusy.value = false;
  }
}

async function stripePortal() {
  stripeError.value = null;
  stripeBusy.value = true;
  try {
    const res = await client.POST("/api/billing/stripe/portal-session", {});
    if (res.response.status !== 200 || !res.data?.portalSessionUrl) {
      stripeError.value =
        messageFromMaybeError(res.error) ?? "Customer portal could not be opened.";
      return;
    }
    window.location.assign(res.data.portalSessionUrl);
  } finally {
    stripeBusy.value = false;
  }
}

const pwdCurrent = ref("");
const pwdNext = ref("");
const pwdBusy = ref(false);
const pwdError = ref<string | null>(null);
const pwdOk = ref<string | null>(null);

async function changePasswordSubmit() {
  pwdError.value = null;
  pwdOk.value = null;
  pwdBusy.value = true;
  try {
    const body = await buildPasswordChangePayload({
      oldPassword: pwdCurrent.value,
      newPassword: pwdNext.value,
    });
    const res = await client.POST("/api/users/me/password", { body });
    if (res.response.status !== 204) {
      pwdError.value = messageFromMaybeError(res.error) ?? "Password change failed.";
      return;
    }
    clearSessionCrypto();
    pwdOk.value =
      "Password updated. Signing you out locally — please sign in with the new password.";
    pwdCurrent.value = "";
    pwdNext.value = "";
    window.setTimeout(() => {
      window.location.assign("/login?reason=password-changed");
    }, 900);
  } catch (e) {
    pwdError.value = e instanceof Error ? e.message : "Password change failed.";
  } finally {
    pwdBusy.value = false;
  }
}

function loginHashPayload(password: string): string {
  return uint8ToBase64(loginPreimageFromPassword(password));
}

const verifyEmailBusy = ref(false);
const verifyEmailError = ref<string | null>(null);
const verifyEmailOk = ref<string | null>(null);
const resendEmail = ref("");
const verifyCodeConfirm = ref("");

async function resendVerification() {
  verifyEmailBusy.value = true;
  verifyEmailError.value = null;
  verifyEmailOk.value = null;
  try {
    const res = await client.POST("/api/users/email-verification/resend", {
      body: { email: resendEmail.value.trim().toLowerCase() },
    });
    if (res.response.status === 204) {
      verifyEmailOk.value = "If outbound email is configured, a message was sent.";
      return;
    }
    verifyEmailError.value = messageFromMaybeError(res.error) ?? "Could not resend.";
  } finally {
    verifyEmailBusy.value = false;
  }
}

async function confirmVerification() {
  verifyEmailBusy.value = true;
  verifyEmailError.value = null;
  verifyEmailOk.value = null;
  try {
    const res = await client.POST("/api/users/email-verification/confirm", {
      body: { emailVerificationCode: verifyCodeConfirm.value.trim() },
    });
    if (res.response.status === 204) {
      verifyEmailOk.value = "Email verified.";
      verifyCodeConfirm.value = "";
      await fetchMe();
      return;
    }
    verifyEmailError.value =
      messageFromMaybeError(res.error) ?? "Verification failed.";
  } finally {
    verifyEmailBusy.value = false;
  }
}

const emailChangePwd = ref("");
const emailChangeNew = ref("");
const emailChangeBusy = ref(false);
const emailChangeError = ref<string | null>(null);
const emailChangeOk = ref<string | null>(null);
const emailChangeDevHint = ref<string | null>(null);

async function requestEmailChange() {
  emailChangeBusy.value = true;
  emailChangeError.value = null;
  emailChangeOk.value = null;
  emailChangeDevHint.value = null;
  try {
    const res = await client.POST("/api/users/me/email-change", {
      body: {
        oldLoginHash: loginHashPayload(emailChangePwd.value),
        newEmail: emailChangeNew.value.trim().toLowerCase(),
      },
    });
    emailChangePwd.value = "";
    if (res.response.status === 204) {
      emailChangeOk.value =
        "Check the new inbox for a verification code, then confirm below.";
      emailChangeDevHint.value = null;
      return;
    }
    if (res.response.status === 200 && res.data?.emailVerificationCode) {
      emailChangeOk.value =
        "Email change pending. With SEND_EMAILS=false the code is shown here for convenience.";
      emailChangeDevHint.value = res.data.emailVerificationCode;
      return;
    }
    emailChangeError.value =
      messageFromMaybeError(res.error) ?? "Could not start email change.";
  } finally {
    emailChangeBusy.value = false;
  }
}

const emailConfirmPwd = ref("");
const emailConfirmNewPw = ref("");
const emailConfirmCode = ref("");
const emailConfirmBusy = ref(false);
const emailConfirmError = ref<string | null>(null);

async function confirmEmailChange() {
  emailConfirmBusy.value = true;
  emailConfirmError.value = null;
  try {
    const body = await buildEmailChangeConfirmPayload({
      currentPassword: emailConfirmPwd.value,
      newPasswordAfterChange: emailConfirmNewPw.value,
      emailVerificationCode: emailConfirmCode.value,
    });
    const res = await client.POST("/api/users/me/email-change/confirm", { body });
    if (res.response.status !== 204) {
      emailConfirmError.value =
        messageFromMaybeError(res.error) ?? "Could not confirm email change.";
      return;
    }
    clearSessionCrypto();
    emailConfirmPwd.value = "";
    emailConfirmNewPw.value = "";
    emailConfirmCode.value = "";
    window.location.assign("/login?reason=email-changed");
  } catch (e) {
    emailConfirmError.value = e instanceof Error ? e.message : "Confirm failed.";
  } finally {
    emailConfirmBusy.value = false;
  }
}

const deletePwd = ref("");
const deleteBusy = ref(false);
const deleteError = ref<string | null>(null);

async function deleteAccountConfirm() {
  deleteBusy.value = true;
  deleteError.value = null;
  try {
    const body: components["schemas"]["UserAccountDeleteRequest"] = {
      loginHash: loginHashPayload(deletePwd.value),
    };
    const res = await client.DELETE("/api/users/me", { body });
    if (res.response.status !== 204) {
      deleteError.value =
        messageFromMaybeError(res.error) ?? "Account could not be deleted.";
      return;
    }
    clearSessionCrypto();
    window.location.assign("/login?reason=deleted");
  } finally {
    deleteBusy.value = false;
  }
}

function messageFromMaybeError(e: unknown): string | undefined {
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string") {
      return m;
    }
  }
  return undefined;
}

const tfaPwd = ref("");
const tfaBusy = ref(false);
const tfaError = ref<string | null>(null);
const tfaOk = ref<string | null>(null);
const tfaKeyUri = ref<string | null>(null);
const tfaSecret = ref<string | null>(null);
const tfaOtp = ref("");
const tfaReloadSecret = ref<string | null>(null);
const tfaReloadUri = ref<string | null>(null);
const tfaRecoveryCodesShown = ref<string[] | null>(null);

async function twoFaEnableRequest() {
  tfaBusy.value = true;
  tfaError.value = null;
  tfaKeyUri.value = null;
  tfaSecret.value = null;
  tfaOk.value = null;
  try {
    const res = await client.POST("/api/users/me/2fa/enable/request", {
      body: { loginHash: loginHashPayload(tfaPwd.value) },
    });
    if (res.response.status !== 200 || !res.data?.keyUri) {
      tfaError.value = messageFromMaybeError(res.error) ?? "2FA setup failed.";
      return;
    }
    tfaKeyUri.value = res.data.keyUri;
    tfaSecret.value = res.data.secret ?? null;
    tfaOk.value =
      "Add the OTP to your app, enter a 6-digit code, then Complete.";
  } catch {
    tfaError.value = "2FA setup failed.";
  } finally {
    tfaBusy.value = false;
  }
}

async function twoFaFinish() {
  tfaBusy.value = true;
  tfaError.value = null;
  tfaOk.value = null;
  try {
    const res = await client.POST("/api/users/me/2fa/enable/finish", {
      body: {
        loginHash: loginHashPayload(tfaPwd.value),
        authenticatorToken: tfaOtp.value.trim(),
      },
    });
    if (res.response.status !== 200 || !res.data?.recoveryCodes) {
      tfaError.value = messageFromMaybeError(res.error) ?? "2FA activation failed.";
      return;
    }
    tfaRecoveryCodesShown.value = res.data.recoveryCodes;
    tfaKeyUri.value = null;
    tfaSecret.value = null;
    tfaOtp.value = "";
    tfaOk.value = "Two-factor authentication is enabled.";
  } finally {
    tfaBusy.value = false;
  }
}

async function twoFaDisable() {
  tfaBusy.value = true;
  tfaError.value = null;
  tfaOk.value = null;
  try {
    const res = await client.POST("/api/users/me/2fa/disable", {
      body: { loginHash: loginHashPayload(tfaPwd.value) },
    });
    if (res.response.status !== 204) {
      tfaError.value = messageFromMaybeError(res.error) ?? "Could not disable 2FA.";
      return;
    }
    tfaRecoveryCodesShown.value = null;
    tfaOk.value = "Two-factor authentication is disabled.";
  } finally {
    tfaBusy.value = false;
  }
}

async function twoFaLoadSecrets() {
  tfaBusy.value = true;
  tfaError.value = null;
  tfaReloadSecret.value = null;
  tfaReloadUri.value = null;
  tfaOk.value = null;
  try {
    const res = await client.POST("/api/users/me/2fa/load", {
      body: { loginHash: loginHashPayload(tfaPwd.value) },
    });
    if (res.response.status !== 200 || !res.data?.keyUri) {
      tfaError.value =
        messageFromMaybeError(res.error) ?? "Authenticator secret unavailable.";
      return;
    }
    tfaReloadSecret.value = res.data.secret ?? null;
    tfaReloadUri.value = res.data.keyUri;
    tfaOk.value = "Treat this secret like a password — store securely.";
  } finally {
    tfaBusy.value = false;
  }
}

const tfaRecoveryBusy = ref(false);

async function regenerateRecoveryCodes() {
  tfaRecoveryBusy.value = true;
  tfaError.value = null;
  tfaOk.value = null;
  tfaRecoveryCodesShown.value = null;
  try {
    const res = await client.POST("/api/users/me/2fa/recovery-codes", {
      body: { loginHash: loginHashPayload(tfaPwd.value) },
    });
    if (res.response.status !== 200 || !res.data?.recoveryCodes) {
      tfaError.value = messageFromMaybeError(res.error) ?? "Could not regenerate codes.";
      return;
    }
    tfaRecoveryCodesShown.value = res.data.recoveryCodes;
    tfaOk.value = "Save these recovery codes in a secure place.";
  } finally {
    tfaRecoveryBusy.value = false;
  }
}

async function forgetTrustedDevices() {
  tfaBusy.value = true;
  tfaError.value = null;
  tfaOk.value = null;
  try {
    const res = await client.POST("/api/users/me/2fa/devices/forget", {
      body: { loginHash: loginHashPayload(tfaPwd.value) },
    });
    if (res.response.status !== 204) {
      tfaError.value =
        messageFromMaybeError(res.error) ?? "Could not forget trusted devices.";
      return;
    }
    tfaOk.value =
      "Trusted devices cleared — you will need 2FA on the next sensitive sign-in.";
  } finally {
    tfaBusy.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-lg font-semibold tracking-tight">Account</h1>
      <p class="text-muted-foreground mt-1 text-sm">
        Billing and security settings mapped to REST (<code class="bg-muted rounded px-1 py-0.5 text-xs">/api/users/me/**</code>).
      </p>
    </div>

    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-base">Subscription</CardTitle>
        <CardDescription>
          Opens Stripe-hosted checkout or the customer billing portal when <code class="rounded bg-muted px-1 py-0.5 text-xs">STRIPE_*</code>
          variables are configured in the API Worker.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-wrap gap-2">
        <Button
          :disabled="
            stripeBusy || !user?.emailVerified || loading
          "
          size="sm"
          variant="secondary"
          @click="stripeCheckout('monthly')"
        >
          Upgrade (monthly)
        </Button>
        <Button
          :disabled="
            stripeBusy || !user?.emailVerified || loading
          "
          size="sm"
          variant="secondary"
          @click="stripeCheckout('yearly')"
        >
          Upgrade (yearly)
        </Button>
        <Button
          :disabled="stripeBusy || loading"
          size="sm"
          variant="outline"
          @click="stripePortal"
        >
          Customer portal
        </Button>
      </CardContent>
      <CardFooter class="flex flex-col gap-2 border-t pt-4">
        <p v-if="user && !user?.emailVerified" class="text-muted-foreground text-xs">
          Verify email first to start checkout (<code class="rounded bg-muted px-1">emailVerified</code>).
        </p>
        <p v-if="stripeError" class="text-destructive text-sm">
          {{ stripeError }}
        </p>
      </CardFooter>
    </Card>

    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-base">Change password</CardTitle>
        <CardDescription>
          Invalidates all sessions server-side — you’ll sign in again with the new password.
        </CardDescription>
      </CardHeader>
      <CardContent class="grid gap-3 sm:max-w-md">
        <div class="space-y-2">
          <Label for="pw-old">Current password</Label>
          <Input
            id="pw-old"
            v-model="pwdCurrent"
            type="password"
            autocomplete="current-password"
          />
        </div>
        <div class="space-y-2">
          <Label for="pw-new">New password</Label>
          <Input
            id="pw-new"
            v-model="pwdNext"
            type="password"
            autocomplete="new-password"
          />
        </div>
        <Button
          :disabled="
            pwdBusy || !(pwdCurrent && pwdNext) || loading
          "
          size="sm"
          @click="changePasswordSubmit"
        >
          {{ pwdBusy ? "Updating…" : "Update password" }}
        </Button>
        <p v-if="pwdError" class="text-destructive text-sm">{{ pwdError }}</p>
        <p v-if="pwdOk" class="text-muted-foreground text-xs">{{ pwdOk }}</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-base">Email verification</CardTitle>
        <CardDescription>Resend the link/code flow for the address used at registration.</CardDescription>
      </CardHeader>
      <CardContent class="grid max-w-xl gap-4">
        <div class="grid gap-2 sm:flex sm:items-end sm:gap-3">
          <div class="min-w-[12rem] flex-1 space-y-2">
            <Label for="ev-email">Email</Label>
            <Input
              id="ev-email"
              v-model="resendEmail"
              type="email"
              autocomplete="email"
              placeholder="you@example.com"
            />
          </div>
          <Button
            size="sm"
            :disabled="verifyEmailBusy || !resendEmail.trim()"
            @click="resendVerification"
          >
            Resend verification
          </Button>
        </div>
        <div class="grid gap-2 sm:flex sm:items-end sm:gap-3">
          <div class="min-w-[12rem] flex-1 space-y-2">
            <Label for="ev-code">Verification code</Label>
            <Input
              id="ev-code"
              v-model="verifyCodeConfirm"
              type="text"
              autocomplete="one-time-code"
              placeholder="Paste code"
            />
          </div>
          <Button
            size="sm"
            :disabled="verifyEmailBusy || !verifyCodeConfirm.trim()"
            variant="outline"
            @click="confirmVerification"
          >
            Confirm email
          </Button>
        </div>
        <p v-if="verifyEmailOk" class="text-muted-foreground text-xs">{{ verifyEmailOk }}</p>
        <p v-if="verifyEmailError" class="text-destructive text-xs">{{ verifyEmailError }}</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-base">Change login email</CardTitle>
        <CardDescription>
          Requests a verification code sent to the new address. Locally, with <code class="rounded bg-muted px-1 py-0.5 text-xs">SEND_EMAILS=false</code>, the worker may echo the code in the HTTP response instead of emailing it.
        </CardDescription>
      </CardHeader>
      <CardContent class="grid max-w-xl gap-3">
        <div class="space-y-2">
          <Label for="ech-pwd">Current password</Label>
          <Input
            id="ech-pwd"
            v-model="emailChangePwd"
            type="password"
            autocomplete="current-password"
          />
        </div>
        <div class="space-y-2">
          <Label for="ech-ne">New email</Label>
          <Input
            id="ech-ne"
            v-model="emailChangeNew"
            type="email"
            autocomplete="email"
          />
        </div>
        <Button
          size="sm"
          :disabled="
            emailChangeBusy || !(emailChangePwd && emailChangeNew.trim())
          "
          @click="requestEmailChange"
        >
          {{ emailChangeBusy ? "Sending…" : "Send verification email" }}
        </Button>
        <p v-if="emailChangeOk" class="text-muted-foreground text-xs">{{ emailChangeOk }}</p>
        <p v-if="emailChangeDevHint" class="font-mono text-xs">
          Dev code:
          {{ emailChangeDevHint }}
        </p>
        <p v-if="emailChangeError" class="text-destructive text-sm">{{ emailChangeError }}</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-base">Confirm email change</CardTitle>
        <CardDescription>
          After verifying the inbox code, finalize the address change and rotate password encryption (<code class="rounded bg-muted px-1 py-0.5 text-xs">POST /api/users/me/email-change/confirm</code> — you will be signed out).
        </CardDescription>
      </CardHeader>
      <CardContent class="grid max-w-xl gap-3">
        <div class="space-y-2">
          <Label for="ecc-code">Verification code</Label>
          <Input
            id="ecc-code"
            v-model="emailConfirmCode"
            type="text"
            autocomplete="one-time-code"
          />
        </div>
        <div class="space-y-2">
          <Label for="ecc-cp">Current password</Label>
          <Input
            id="ecc-cp"
            v-model="emailConfirmPwd"
            type="password"
          />
        </div>
        <div class="space-y-2">
          <Label for="ecc-np">New password (after change)</Label>
          <Input
            id="ecc-np"
            v-model="emailConfirmNewPw"
            type="password"
            autocomplete="new-password"
          />
        </div>
        <Button
          size="sm"
          :disabled="
            emailConfirmBusy
              || !(emailConfirmCode.trim() && emailConfirmPwd && emailConfirmNewPw)
          "
          @click="confirmEmailChange"
        >
          {{ emailConfirmBusy ? "Confirming…" : "Confirm email change" }}
        </Button>
        <p v-if="emailConfirmError" class="text-destructive text-sm">{{ emailConfirmError }}</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-base">Two-factor authentication</CardTitle>
        <CardDescription>
          Use your DeepNotes login password once per sensitive action (<code class="rounded bg-muted px-1 py-0.5 text-xs">loginHash</code> payloads).
        </CardDescription>
      </CardHeader>
      <CardContent class="grid max-w-xl gap-4">
        <div class="space-y-2">
          <Label for="tfa-pw">Password for 2FA actions</Label>
          <Input
            id="tfa-pw"
            v-model="tfaPwd"
            type="password"
            autocomplete="current-password"
          />
        </div>
        <div class="flex flex-wrap gap-2">
          <Button
            size="sm"
            :disabled="
              tfaBusy
                || !tfaPwd
            "
            variant="outline"
            @click="twoFaEnableRequest"
          >
            Begin setup
          </Button>
          <Button
            size="sm"
            :disabled="
              tfaBusy
                || !tfaPwd
            "
            variant="outline"
            @click="twoFaLoadSecrets"
          >
            Show authenticator URI
          </Button>
          <Button
            size="sm"
            :disabled="
              tfaRecoveryBusy || !tfaPwd
            "
            variant="outline"
            @click="regenerateRecoveryCodes"
          >
            Replace recovery codes
          </Button>
          <Button
            size="sm"
            :disabled="
              tfaBusy || !tfaPwd
            "
            variant="outline"
            @click="forgetTrustedDevices"
          >
            Forget trusted devices
          </Button>
          <Button
            size="sm"
            :disabled="
              tfaBusy || !tfaPwd
            "
            variant="destructive"
            @click="twoFaDisable"
          >
            Disable 2FA
          </Button>
        </div>
        <div
          v-if="tfaKeyUri"
          class="bg-muted rounded-md p-3 text-xs break-all"
        >
          <p class="text-muted-foreground mb-2 font-semibold">
            otpauth URI (paste into an authenticator):
          </p>
          {{ tfaKeyUri }}
          <p v-if="tfaSecret" class="mt-3 font-mono">
            Raw secret:
            {{ tfaSecret }}
          </p>
          <div class="mt-4 space-y-2">
            <Label for="tfa-tok">6-digit code</Label>
            <div class="flex flex-wrap gap-2">
              <Input
                id="tfa-tok"
                v-model="tfaOtp"
                type="text"
                autocomplete="one-time-code"
                class="max-w-[10rem]"
                placeholder="123456"
              />
              <Button
                size="sm"
                :disabled="
                  tfaBusy || tfaOtp.length < 6
                "
                @click="twoFaFinish"
              >
                Complete setup
              </Button>
            </div>
          </div>
        </div>
        <div v-if="tfaReloadUri" class="bg-muted rounded-md p-3 text-xs break-all">
          <p class="text-muted-foreground mb-2 font-semibold">
            Reloaded otpauth URI
          </p>
          {{ tfaReloadUri }}
          <p v-if="tfaReloadSecret" class="mt-3 font-mono">
            Raw secret:
            {{ tfaReloadSecret }}
          </p>
        </div>
        <p v-if="tfaError" class="text-destructive text-sm">{{ tfaError }}</p>
        <p v-if="tfaOk" class="text-muted-foreground text-sm">{{ tfaOk }}</p>
        <ul
          v-if="tfaRecoveryCodesShown?.length"
          class="bg-muted rounded-md px-4 py-3 font-mono text-sm"
        >
          <li
            v-for="(c, i) in tfaRecoveryCodesShown"
            :key="i"
          >
            {{ c }}
          </li>
        </ul>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-base text-red-700 dark:text-red-300">Delete account</CardTitle>
        <CardDescription>
          Permanently removes the account when checks pass (<code class="rounded bg-muted px-1 py-0.5 text-xs">DELETE /api/users/me</code> — cannot be undone).
        </CardDescription>
      </CardHeader>
      <CardContent class="grid max-w-md gap-3">
        <div class="space-y-2">
          <Label for="del-pw">Password</Label>
          <Input
            id="del-pw"
            v-model="deletePwd"
            type="password"
          />
        </div>
        <Button
          size="sm"
          variant="destructive"
          :disabled="deleteBusy || !deletePwd"
          @click="deleteAccountConfirm"
        >
          {{ deleteBusy ? "Deleting…" : "Delete my account" }}
        </Button>
        <p v-if="deleteError" class="text-destructive text-sm">{{ deleteError }}</p>
      </CardContent>
    </Card>
    <p class="text-muted-foreground pb-10 text-xs">
      Session refreshed from the header —
      use <RouterLink class="underline" to="/notifications">notifications</RouterLink>
      for encrypted inbox payloads when signed in with password-backed keyrings.
    </p>
  </div>
</template>
