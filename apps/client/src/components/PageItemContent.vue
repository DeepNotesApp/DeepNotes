<template>
  <q-item-section
    v-if="icon"
    avatar
  >
    <q-icon
      name="mdi-note-text"
      class="page-icon"
      :class="{
        encrypted: pageTitleInfo.status === 'encrypted',
        empty: isEmpty,
      }"
    />
  </q-item-section>

  <q-item-section>
    <q-item-label
      class="page-group"
      caption
    >
      {{ groupNameInfo.text }}
    </q-item-label>

    <q-item-label
      class="page-title"
      :class="{
        encrypted: pageTitleInfo.status === 'encrypted',
        empty: isEmpty,
      }"
    >
      {{ pageTitleInfo.text }}
    </q-item-label>
  </q-item-section>
</template>

<script setup lang="ts">
import { groupNames } from 'src/code/pages/computed/group-names';
import { pageGroupIds } from 'src/code/pages/computed/page-group-id';
import { getPageTitle } from 'src/code/pages/utils';
import { useRealtimeContext } from 'src/code/realtime/context';

const props = defineProps<{
  icon: boolean;
  pageId: string;
  prefer: 'relative' | 'absolute';
}>();

const realtimeCtx = useRealtimeContext();

const pageGroupId = computed(() => pageGroupIds()(props.pageId).get());
const groupNameInfo = computed(() => groupNames()(pageGroupId.value!).get());
const pageTitleInfo = computed(() =>
  getPageTitle(props.pageId, { prefer: props.prefer }),
);

const isEmpty = computed(
  () =>
    !!realtimeCtx.hget('page', props.pageId, 'permanent-deletion-date') ||
    !!realtimeCtx.hget(
      'group',
      pageGroupId.value!,
      'permanent-deletion-date',
    ) ||
    (pageTitleInfo.value.status !== 'success' &&
      groupNameInfo.value.status !== 'success'),
);
</script>

<style scoped>
.page-group {
  color: #60b2ff;
}

.page-title {
  font-size: 13.8px;
}

.encrypted {
  color: rgba(150, 150, 255, 1);
}
.empty {
  color: rgba(255, 150, 150, 1);
}
</style>
