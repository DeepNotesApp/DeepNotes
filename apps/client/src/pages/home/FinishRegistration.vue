<template>
  <q-page>
    <ResponsiveContainer style="padding: 180px 0; text-align: center">
      <template v-if="internals.sessionStorage?.getItem('email') != null">
        <div style="font-size: 16px">
          We've sent a verification link to<br />
          <span style="color: #03a9f4">{{
            internals.sessionStorage?.getItem('email')
          }}</span
          >.<br />
          Check your e-mail to proceed.
        </div>

        <Gap style="height: 32px" />
      </template>

      <DeepBtn
        label="Go to login"
        color="primary"
        style="font-size: 16px; padding: 10px 22px"
        :to="{ name: 'login' }"
      />
    </ResponsiveContainer>
  </q-page>
</template>

<script setup lang="ts">
useMeta(() => ({
  title: 'Finish registration - DeepNotes',
}));
</script>
