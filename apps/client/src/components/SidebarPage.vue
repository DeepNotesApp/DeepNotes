<template>
  <q-item
    :class="{ [group]: true }"
    :data-page-id="pageId"
    clickable
    active-class="bg-grey-9 text-grey-1"
    v-ripple
    :active="pageId === internals.pages.react.pageId"
    @click="
      internals.pages.goToPage(pageId, {
        openInNewTab: ($event as MouseEvent).ctrlKey,
      })
    "
  >
    <q-item-section avatar>
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
        caption
        style="color: #60b2ff"
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

    <q-tooltip
      v-if="!uiStore().leftSidebarExpanded"
      anchor="center right"
      self="center left"
      max-width="200px"
      transition-show="jump-right"
      transition-hide="jump-left"
    >
      <div style="font-size: 12px">{{ groupNameInfo.text }}</div>

      <div style="font-weight: bold; font-size: 14px">
        {{ pageTitleInfo.text }}
      </div>
    </q-tooltip>
  </q-item>
</template>

<script setup lang="ts">
import { groupNames } from 'src/code/pages/computed/group-names';
import { pageGroupIds } from 'src/code/pages/computed/page-group-id';
import { getPageTitle } from 'src/code/pages/utils';
import { useRealtimeContext } from 'src/code/realtime/context';

const props = defineProps<{
  group: string;
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
.encrypted {
  color: rgba(150, 150, 255, 1);
}
.empty {
  color: rgba(255, 150, 150, 1);
}
</style>
