<template>
  <Combobox
    label="Link URL"
    :disable="page.react.readOnly"
    :options="linkOptions"
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #item="scope">
      <PageItemContent
        :icon="false"
        :page-id="scope.opt.pageId"
        prefer="absolute"
      />
    </template>
  </Combobox>
</template>

<script setup lang="ts">
import { useRealtimeContext } from 'src/code/realtime/context';

import type { ComboboxProps } from './Combobox.vue';

interface Props extends ComboboxProps {
  modelValue: any;
}

defineProps<Props>();

const page = computed(() => internals.pages.react.page);

const realtimeCtx = useRealtimeContext();

const linkOptions = computed(() =>
  internals.pages.react.recentPageIds
    .map((pageId) => {
      const groupId = realtimeCtx.hget('page', pageId, 'group-id');

      if (groupId == null) {
        return;
      }

      if (
        realtimeCtx.hget('group', groupId, 'permanent-deletion-date') != null ||
        realtimeCtx.hget('page', pageId, 'permanent-deletion-date') != null
      ) {
        return;
      }

      return {
        pageId,
        value: `/pages/${pageId}`,
      };
    })
    .filter((page) => page != null),
);
</script>

<style scoped>
.group-name {
  color: #60b2ff;
}
</style>
