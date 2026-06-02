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
  buildEmailChangeConfirmPayload,
} from "../auth/build-password-and-email-confirm";
import { loginPreimageFromPassword, uint8ToBase64 } from "../auth/bytes";
import { clearSessionCrypto } from "../auth/crypto-storage";
import { useSession } from "../auth/useSession";

const { client, user, loading, fetchMe } = useSession();

function messageFromMaybeError(e: unknown): string | undefined {
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string") {
      return m;
    }
  }
  return undefined;
}

// Email verification
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

// Change email
const emailChangePwd = ref("");
const emailChangeNew = ref("");
const emailChangeBusy = ref(false);
const emailChangeError = ref<string | null>(null);
const emailChangeOk = ref<string | null>(null);

async function requestEmailChange() {
  emailChangeBusy.value = true;
  emailChangeError.value = null;
  emailChangeOk.value = null;
  try {
    const res = await client.POST("/api/users/me/email-change", {
      body: {
        oldLoginHash: uint8ToBase64(loginPreimageFromPassword(emailChangePwd.value)),
        newEmail: emailChangeNew.value.trim().toLowerCase(),
      },
    });
    emailChangePwd.value = "";
    if (res.response.status === 204) {
      emailChangeOk.value =
        "Check the new inbox for a verification code, then confirm below.";
      return;
    }
    if (res.response.status === 200 && res.data?.emailVerificationCode) {
      emailChangeOk.value =
        "Email change pending. Check the developer console for the verification code.";
      // eslint-disable-next-line no-console
      console.log("Email verification code:", res.data.emailVerificationCode);
      return;
    }
    emailChangeError.value =
      messageFromMaybeError(res.error) ?? "Could not start email change.";
  } finally {
    emailChangeBusy.value = false;
  }
}

// Confirm email change
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

// Delete account
const deletePwd = ref("");
const deleteBusy = ref(false);
const deleteError = ref<string | null>(null);

async function deleteAccountConfirm() {
  deleteBusy.value = true;
  deleteError.value = null;
  try {
    const body = { loginHash: uint8ToBase64(loginPreimageFromPassword(deletePwd.value)) };
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
</script>

<template>
  <div class="space-y-6">
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-base">Email verification</CardTitle>
        <CardDescription>Resend the link or code flow for the address used at registration.</CardDescription>
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
          Requests a verification code sent to the new address.
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
          :disabled="emailChangeBusy || !(emailChangePwd && emailChangeNew.trim())"
          @click="requestEmailChange"
        >
          {{ emailChangeBusy ? "Sending…" : "Send verification email" }}
        </Button>
        <p v-if="emailChangeOk" class="text-muted-foreground text-xs">{{ emailChangeOk }}</p>
        <p v-if="emailChangeError" class="text-destructive text-sm">{{ emailChangeError }}</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-base">Confirm email change</CardTitle>
        <CardDescription>
          After verifying the inbox code, finalize the address change and rotate password encryption. You will be signed out.
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
          :disabled="emailConfirmBusy || !(emailConfirmCode.trim() && emailConfirmPwd && emailConfirmNewPw)"
          @click="confirmEmailChange"
        >
          {{ emailConfirmBusy ? "Confirming…" : "Confirm email change" }}
        </Button>
        <p v-if="emailConfirmError" class="text-destructive text-sm">{{ emailConfirmError }}</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-base text-red-700 dark:text-red-300">Delete account</CardTitle>
        <CardDescription>
          Permanently removes the account when checks pass. This cannot be undone.
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
  </div>
</template>
