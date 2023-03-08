<template>
  <q-page>
    <ResponsiveContainer style="padding: 150px 32px">
      <div style="margin: 0px auto; max-width: 270px">
        <q-form>
          <Standard v-if="authType === 'standard'" />
          <Authenticator v-else-if="authType === 'authenticator'" />
          <Recovery v-else-if="authType === 'recovery'" />
        </q-form>
      </div>
    </ResponsiveContainer>
  </q-page>
</template>

<script setup lang="ts">
import Authenticator from './Authenticator.vue';
import Recovery from './Recovery.vue';
import Standard from './Standard.vue';

useMeta(() => ({
  title: 'Login - DeepNotes',
}));

const authType = ref('standard');
provide('authType', authType);

const email = ref('');
provide('email', email);

const password = ref('');
provide('password', password);

const rememberSession = ref(false);
provide('rememberSession', rememberSession);

onMounted(() => {
  email.value = internals.localStorage.getItem('email') ?? '';
});
</script>
