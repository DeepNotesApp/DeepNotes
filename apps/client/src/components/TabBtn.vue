<template>
  <q-item
    clickable
    :active="currentTab === name"
    active-class="bg-grey-9 text-grey-1"
    v-ripple
    @click="$emit('set-tab', name)"
  >
    <q-item-section avatar>
      <q-icon :name="icon" />
    </q-item-section>
    <q-item-section>{{ name }}</q-item-section>
  </q-item>
</template>

<script setup lang="ts">
defineProps<{
  name: string;
  icon: string;
  currentTab: string;
}>();
</script>
