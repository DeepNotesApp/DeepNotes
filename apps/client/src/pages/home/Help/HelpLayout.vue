<template>
  <q-page>
    <ResponsiveContainer>
      <Gap style="height: 150px" />

      <router-link
        style="font-size: 14.5px"
        :to="{ name: 'help' }"
      >
        <span
          style="
            position: relative;
            top: 1px;
            font-weight: bold;
            font-size: 1.3em;
          "
        >
          ←
        </span>
        <span style="font-weight: bold">Back to help page</span>
      </router-link>

      <Gap style="height: 64px" />

      <router-view />

      <Gap style="height: 170px" />
    </ResponsiveContainer>
  </q-page>
</template>

<script setup lang="ts">
useMeta(() => ({
  title: 'How to create a group? - Help - DeepNotes',
}));
</script>
