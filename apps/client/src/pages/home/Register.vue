<template>
  <q-page>
    <ResponsiveContainer style="padding: 120px 0">
      <q-form style="margin: 0px auto; max-width: 270px">
        <div
          style="display: flex; justify-content: center; align-items: center"
        >
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

        <q-input
          label-slot
          filled
          stack-label
          label-color="grey-5"
          v-model="email"
          :maxlength="maxEmailLength"
        >
          <template #label>
            Email

            <q-icon
              name="mdi-information"
              size="18px"
              style="margin-top: -4px; pointer-events: auto"
            >
              <q-tooltip
                anchor="top middle"
                self="bottom middle"
                transition-show="jump-up"
                transition-hide="jump-down"
                max-width="230px"
              >
                This is the only information readable to the server. Used for
                user identification and communication.
              </q-tooltip>
            </q-icon>
          </template>
        </q-input>

        <Gap style="height: 12px" />

        <q-input
          label-slot
          filled
          stack-label
          label-color="grey-5"
          autocomplete="username"
          v-model="userName"
          :maxlength="maxNameLength"
        >
          <template #label>
            Display name

            <q-icon
              name="mdi-information"
              size="18px"
              style="margin-top: -4px; pointer-events: auto"
            >
              <q-tooltip
                anchor="top middle"
                self="bottom middle"
                transition-show="jump-up"
                transition-hide="jump-down"
                max-width="165px"
              >
                This value is encrypted, unreadable to the server.
              </q-tooltip>
            </q-icon>
          </template>
        </q-input>

        <Gap style="height: 12px" />

        <EvaluatedPasswordField
          label="Password"
          stack-label
          autocomplete="new-password"
          v-model="password"
        />

        <Gap style="height: 12px" />

        <PasswordField
          label="Repeat password"
          stack-label
          autocomplete="new-password"
          v-model="repeatPassword"
        />

        <Gap style="height: 20px" />

        <div style="display: flex">
        <Checkbox
          v-model="agree"
            style="flex: none"
        />

          <div style="flex: 1">
            I have read and agree to the<br />
            <router-link :to="{ name: 'privacy-policy' }">
              Privacy Policy
            </router-link>
            and
            <router-link :to="{ name: 'terms-of-service' }">
              Terms of Service</router-link
            >.
          </div>
        </div>

        <Gap style="height: 28px" />

        <DeepBtn
          label="Create account"
          type="submit"
          color="primary"
          style="width: 100%; font-size: 16px; padding: 14px 0px"
          delay
          @click.prevent="register()"
        />
      </q-form>

      <Gap style="height: 16px" />

      <div style="text-align: center">
        Already registered?

        <router-link :to="{ name: 'login', query: $route.query }">
          Log in
        </router-link>
      </div>
    </ResponsiveContainer>
  </q-page>
</template>

<script setup lang="ts">
import { maxNameLength } from '@deeplib/misc';
import { maxEmailLength, w3cEmailRegex } from '@stdlib/misc';
import { zxcvbn } from '@zxcvbn-ts/core';
import { enterDemo } from 'src/code/auth/demo.client';
import { getRegistrationValues } from 'src/code/auth/register.client';
import { deriveUserValues } from 'src/code/crypto.client';
import { asyncPrompt, handleError } from 'src/code/utils.client';

useMeta(() => ({
  title: 'Register - DeepNotes',
}));

const email = ref('');
const userName = ref('');
const password = ref('');
const repeatPassword = ref('');

const agree = ref(false);

async function register() {
  try {
    // Check if email is valid

    if (!email.value.match(w3cEmailRegex)) {
      $quasar().notify({
        message: 'Email is invalid.',
        type: 'negative',
      });

      return;
    }

    // Check if display name is empty

    if (userName.value === '') {
      $quasar().notify({
        message: 'Display name cannot be empty.',
        type: 'negative',
      });

      return;
    }

    // Password validation

    if (password.value !== repeatPassword.value) {
      $quasar().notify({
        message: 'Passwords do not match.',
        type: 'negative',
      });

      return;
    }

    // Check password strength

    const zxcvbnResult = zxcvbn(password.value);

    if (zxcvbnResult.score <= 1) {
      $quasar().notify({
        html: true,
        message: 'Password is too weak.<br/>Please use a stronger password.',
        type: 'negative',
      });

      return;
    }

    if (zxcvbnResult.score <= 2) {
      await asyncPrompt({
        title: 'Weak password',
        html: true,
        message:
          'Your password is relatively weak.<br/>Are you sure you want to continue?',
        style: { width: 'max-content', padding: '4px 8px' },

        focus: 'cancel',

        cancel: { label: 'No', flat: true, color: 'primary' },
        ok: { label: 'Yes', flat: true, color: 'negative' },
      });
    }

    if (!agree.value) {
      $quasar().notify({
        message: 'You must agree to the Terms of Service and Privacy Policy.',
        type: 'negative',
      });

      return;
    }

    const derivedKeys = await deriveUserValues(email.value, password.value);

    await api().post('/auth/register', {
      email: email.value,

      ...(await getRegistrationValues(derivedKeys, userName.value)),
    });

    internals.sessionStorage.setItem('email', email.value);

    $quasar().notify({
      message: 'Verification email sent.',
      type: 'positive',
    });

    await router().push({
      name: 'finish-registration',
      query: route().value.query,
    });
  } catch (error: any) {
    handleError(error);
  }
}
</script>

<style scoped lang="scss">
.q-page :deep() {
  .q-field__label {
    font-size: 18px;
  }
}
</style>
