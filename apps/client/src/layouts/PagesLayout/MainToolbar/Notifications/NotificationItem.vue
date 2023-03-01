<template>
  <q-item
    clickable
    v-close-popup
  >
    <q-item-section>
      <slot></slot>

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
