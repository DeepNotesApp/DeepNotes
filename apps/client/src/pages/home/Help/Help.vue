<template>
  <q-page>
    <ResponsiveContainer>
      <Gap style="height: 130px" />

      <div style="font-size: 45px; font-weight: bold; text-align: center">
        Help
      </div>

      <Gap style="height: 56px" />

      <ul class="question-list">
        <li>
          <router-link :to="{ name: 'help/forgot-password' }">
            I've forgotten my password. What can I do?
          </router-link>
        </li>

        <li>
          <router-link :to="{ name: 'help/how-to-create-a-group' }">
            How to create a group?
          </router-link>
        </li>
      </ul>

      <Gap style="height: 160px" />
    </ResponsiveContainer>
  </q-page>
</template>

<script setup lang="ts">
useMeta(() => ({
  title: 'Help - DeepNotes',
}));
</script>

<style scoped lang="scss">
.question-list {
  padding-left: 48px;

  font-size: 17px;
  font-weight: bold;

  > li::marker {
    font-size: 24px;
  }
}
</style>
