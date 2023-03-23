<template>
  <div style="font-size: 22px; text-align: center; font-weight: bold">
    Two-factor Authentication
  </div>

  <Gap style="height: 16px" />

  <TextField
    label="6-digit code"
    label-color="grey-5"
    v-model="authenticatorToken"
    :maxlength="6"
  />

  <Gap style="height: 16px" />

  <Checkbox
    label="Remember this device"
    v-model="rememberDevice"
  />

  <Gap style="height: 16px" />

  <div style="display: flex">
    <DeepBtn
      label="Cancel"
      color="grey-9"
      style="flex: 1; font-size: 16px; padding: 8px 0px"
      @click="authType = 'standard'"
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

  <Gap style="height: 16px" />

  <div style="text-align: center">
    Lost your phone?
    <a @click="authType = 'recovery'">Use a recovery code</a>
  </div>
</template>

<script setup lang="ts">
import { bytesToBase64 } from '@stdlib/base64';
import { login } from 'src/code/auth/login';
import { deriveUserValues } from 'src/code/crypto';
import { handleError } from 'src/code/utils';
import type { Ref } from 'vue';

const authType = inject('authType') as Ref<string>;
const email = inject('email') as Ref<string>;
const password = inject('password') as Ref<string>;
const rememberSession = inject('rememberSession') as Ref<boolean>;

const authenticatorToken = ref('');
const rememberDevice = ref(false);

async function onSubmit() {
  try {
    if (!/^\d{6}$/.test(authenticatorToken.value)) {
      throw new Error('Please enter a valid 6-digit code.');
    }

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

        authenticatorToken: authenticatorToken.value,
        rememberDevice: rememberDevice.value,
        rememberSession: rememberSession.value,
      })
    ).data;

    await login({
      ...response,

      rememberSession: rememberSession.value,

      masterKey: derivedKeys.masterKey,
    });
  } catch (error: any) {
    handleError(error);
  }
}
</script>
