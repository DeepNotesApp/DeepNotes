<template>
  <q-icon
    name="mdi-content-copy"
    size="23px"
    class="cursor-pointer"
    style="margin-right: -3px"
    @click="
      () => {
        setClipboardText(text);

        $q.notify({
          message: 'Copied to clipboard.',
          type: 'positive',
        });
      }
    "
  >
    <q-tooltip
      anchor="top middle"
      self="bottom middle"
      transition-show="jump-up"
      transition-hide="jump-down"
    >
      Copy
    </q-tooltip>
  </q-icon>
</template>

<script setup lang="ts">
import { setClipboardText } from '@stdlib/misc';

defineProps<{
  text: string;
}>();
</script>
