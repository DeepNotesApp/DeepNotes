<template>
  <div style="display: flex; justify-content: center; align-items: center">
    Want a quick taste?

    <Gap style="width: 16px" />

    <DeepBtn
      label="Try the demo"
      color="primary"
      style="padding: 0px 10px; border-radius: 5px; font-size: 14px"
      @click="enterDemo()"
    />
  </div>

  <Gap style="height: 16px" />

  <TextField
    label="Email"
    label-color="grey-5"
    v-model="email"
    autocomplete="username"
    :maxlength="maxEmailLength"
  />

  <Gap style="height: 12px" />

  <PasswordField
    label="Password"
    v-model="password"
    autocomplete="current-password"
  />

  <Gap style="height: 16px" />

  <Checkbox
    label="Remember email"
    v-model="rememberEmail"
  />

  <Gap style="height: 16px" />

  <DeepBtn
    label="Login"
    type="submit"
    color="primary"
    style="width: 100%; font-size: 16px; padding: 14px 0px"
    delay
    @click="onSubmit()"
  />

  <Gap style="height: 16px" />

  <div style="text-align: center">
    Not registered yet?

    <router-link :to="{ name: 'register', query: $route.query }">
      Sign up
    </router-link>
  </div>

  <Gap style="height: 24px" />

  <details style="text-align: center; cursor: default; user-select: none">
    <summary style="display: list-item">Additional options</summary>

    <Gap style="height: 12px" />

    <div>
      <Checkbox
        label="Remember session"
        v-model="rememberSession"
      />

      <q-icon
        name="mdi-information"
        size="17px"
        style="margin-left: 6px; margin-top: 1px"
      >
        <q-tooltip
          anchor="top middle"
          self="bottom middle"
          transition-show="jump-up"
          transition-hide="jump-down"
          max-width="233px"
        >
          This option is convenient, but reduces the security of your account.
        </q-tooltip>
      </q-icon>
    </div>
  </details>
</template>

<script setup lang="ts">
import { bytesToBase64 } from '@stdlib/base64';
import { maxEmailLength, w3cEmailRegex } from '@stdlib/misc';
import { enterDemo } from 'src/code/auth/demo.client';
import { login } from 'src/code/auth/login.client';
import { deriveUserValues } from 'src/code/crypto.client';
import { handleError } from 'src/code/utils.client';
import type { Ref } from 'vue';

const authType = inject('authType') as Ref<string>;
const email = inject('email') as Ref<string>;
const password = inject('password') as Ref<string>;
const rememberSession = inject('rememberSession') as Ref<boolean>;

const rememberEmail = ref(false);

watch([email, rememberEmail], () => {
  if (rememberEmail.value) {
    if (w3cEmailRegex.test(email.value)) {
      internals.localStorage.setItem('email', email.value);
    } else {
      internals.localStorage.setItem('email', '');
    }
  } else {
    internals.localStorage.removeItem('email');
  }
});

watch([rememberSession], () => {
  internals.localStorage?.setItem(
    'rememberSession',
    String(rememberSession.value),
  );
});

onMounted(() => {
  rememberEmail.value = internals.localStorage.getItem('email') != null;
  rememberSession.value =
    internals.localStorage.getItem('rememberSession') === 'true';
});

async function onSubmit() {
  try {
    if (email.value === 'demo') {
      await enterDemo();
      return;
    }

    // Compute password hash

    const derivedKeys = await deriveUserValues(email.value, password.value);

    // Login

    const response = (
      await api().post<{
        twoFactorAuth: boolean;

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
      })
    ).data;

    if (response.twoFactorAuth && authType.value === 'standard') {
      authType.value = 'authenticator';
      return;
    }

    await login({
      ...response,

      rememberSession: rememberSession.value,

      masterKey: derivedKeys.masterKey,
    });
  } catch (error) {
    handleError(error);
  }
}
</script>
