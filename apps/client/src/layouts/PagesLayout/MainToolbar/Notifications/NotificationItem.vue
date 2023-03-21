<template>
  <q-item
    clickable
    v-close-popup
  >
    <q-item-section>
      <slot></slot>

      <Gap style="height: 6px" />

      <q-item-label caption>
        {{
          relativeTimeStr(
            new Date(notification.dateTime).getTime() - Date.now(),
          )
        }}
      </q-item-label>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import type { DeepNotesNotification } from '@deeplib/misc';
import { relativeTimeStr } from '@stdlib/misc';

defineProps<{
  notification: DeepNotesNotification;
}>();
</script>

<style scoped>
.q-item {
  margin: 8px;

  border-radius: 4px;

  padding: 12px 14px;

  background-color: #2a2a2a;
}
</style>
