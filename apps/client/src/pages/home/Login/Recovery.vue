<template>
  <div style="font-size: 22px; text-align: center; font-weight: bold">
    Two-factor Authentication
  </div>

  <Gap style="height: 12px" />

  <div style="text-align: center">
    <span style="color: red">Note: </span>
    <span style="color: #c0c0c0">
      The recovery code provided will be disabled after you use it to log in.
    </span>
  </div>

  <Gap style="height: 12px" />

  <TextField
    label="Recovery code"
    label-color="grey-5"
    v-model="recoveryCode"
    :maxlength="32"
  />

  <Gap style="height: 16px" />

  <div style="display: flex">
    <DeepBtn
      label="Cancel"
      color="grey-9"
      style="flex: 1; font-size: 16px; padding: 8px 0px"
      @click="authType = 'authenticator'"
    />

    <Gap style="width: 16px" />

    <DeepBtn
      label="Verify"
      type="submit"
      color="primary"
      style="flex: 1; font-size: 16px; padding: 8px 0px"
      delay
      @click="onSubmit()"
    />
  </div>
</template>

<script setup lang="ts">
import { bytesToBase64 } from '@stdlib/base64';
import { login } from 'src/code/auth/login.client';
import { deriveUserValues } from 'src/code/crypto.client';
import { handleError } from 'src/code/utils.client';
import type { Ref } from 'vue';

const authType = inject('authType') as Ref<string>;
const email = inject('email') as Ref<string>;
const password = inject('password') as Ref<string>;
const rememberSession = inject('rememberSession') as Ref<boolean>;

const recoveryCode = ref('');

async function onSubmit() {
  try {
    const derivedKeys = await deriveUserValues(email.value, password.value);

    const response = (
      await api().post<{
        publicKeyring: string;
        encryptedPrivateKeyring: string;
        encryptedSymmetricKeyring: string;

        sessionKey: string;

        personalGroupId: string;

        userId: string;
        sessionId: string;
      }>('/auth/login', {
        email: email.value,
        loginHash: bytesToBase64(derivedKeys.loginHash),
        rememberSession: rememberSession.value,

        recoveryCode: recoveryCode.value,
      })
    ).data;

    await login({
      ...response,

      email: email.value,
      rememberSession: rememberSession.value,

      masterKey: derivedKeys.masterKey,
    });
  } catch (error: any) {
    handleError(error);
  }
}
</script>
