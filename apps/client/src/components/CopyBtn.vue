<template>
  <q-icon
    name="mdi-content-copy"
    size="23px"
    class="cursor-pointer"
    style="margin-right: -3px"
    @click="
      async () => {
        await setClipboardText(text);

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
import type { QIconProps } from 'quasar';
import { setClipboardText } from 'src/code/utils/clipboard';

interface Props extends QIconProps {
  text: string;
}

defineProps<Props>();
</script>
