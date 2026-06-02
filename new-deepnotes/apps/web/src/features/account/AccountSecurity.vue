<script setup lang="ts">
import { ref } from "vue";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  buildPasswordChangePayload,
} from "../auth/build-password-and-email-confirm";
import { loginPreimageFromPassword, uint8ToBase64 } from "../auth/bytes";
import { clearSessionCrypto } from "../auth/crypto-storage";
import { useSession } from "../auth/useSession";

const { client } = useSession();

function messageFromMaybeError(e: unknown): string | undefined {
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string") {
      return m;
    }
  }
  return undefined;
}

// Change password
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

// 2FA
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
const tfaRecoveryBusy = ref(false);

function loginHashPayload(password: string): string {
  return uint8ToBase64(loginPreimageFromPassword(password));
}

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
    tfaOk.value = "Add the OTP to your app, enter a 6-digit code, then Complete.";
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
          :disabled="pwdBusy || !(pwdCurrent && pwdNext)"
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
        <CardTitle class="text-base">Two-factor authentication</CardTitle>
        <CardDescription>
          Use your DeepNotes login password once per sensitive action.
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
            :disabled="tfaBusy || !tfaPwd"
            variant="outline"
            @click="twoFaEnableRequest"
          >
            Begin setup
          </Button>
          <Button
            size="sm"
            :disabled="tfaBusy || !tfaPwd"
            variant="outline"
            @click="twoFaLoadSecrets"
          >
            Show authenticator URI
          </Button>
          <Button
            size="sm"
            :disabled="tfaRecoveryBusy || !tfaPwd"
            variant="outline"
            @click="regenerateRecoveryCodes"
          >
            Replace recovery codes
          </Button>
          <Button
            size="sm"
            :disabled="tfaBusy || !tfaPwd"
            variant="outline"
            @click="forgetTrustedDevices"
          >
            Forget trusted devices
          </Button>
          <Button
            size="sm"
            :disabled="tfaBusy || !tfaPwd"
            variant="destructive"
            @click="twoFaDisable"
          >
            Disable 2FA
          </Button>
        </div>
        <div v-if="tfaKeyUri" class="bg-muted rounded-md p-3 text-xs break-all">
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
                :disabled="tfaBusy || tfaOtp.length < 6"
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
          <li v-for="(c, i) in tfaRecoveryCodesShown" :key="i">
            {{ c }}
          </li>
        </ul>
      </CardContent>
    </Card>
  </div>
</template>
