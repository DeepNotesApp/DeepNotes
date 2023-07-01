<template>
  <a
    class="horizontal-page"
    :class="{ active }"
    :href="`/pages/${pageId}`"
    @click.prevent.stop="internals.pages.goToPage(pageId)"
  >
    <div class="group-title">
      {{ groupNameInfo.text }}
    </div>

    <div
      class="page-title"
      :class="{
        encrypted: pageTitleInfo.status === 'encrypted',
        empty: isEmpty,
      }"
    >
      {{ pageTitleInfo.text }}
    </div>
  </a>
</template>

<script setup lang="ts">
import { watchUntilTrue } from '@stdlib/vue';
import { groupNames } from 'src/code/pages/computed/group-names';
import { pageGroupIds } from 'src/code/pages/computed/page-group-id';
import { getPageTitle } from 'src/code/pages/utils';
import { useRealtimeContext } from 'src/code/realtime/context';

const props = defineProps<{
  pageId: string;
  active: boolean;
}>();

const realtimeCtx = useRealtimeContext();

const pageGroupId = computed(() => pageGroupIds()(props.pageId).get());
const groupNameInfo = computed(() => groupNames()(pageGroupId.value!).get());
const pageTitleInfo = computed(() =>
  getPageTitle(props.pageId, { prefer: 'relative' }),
);

const loading = ref(true);

onMounted(() => {
  void watchUntilTrue(() => {
    if (!internals.realtime.loading) {
      loading.value = false;
    }

    return !internals.realtime.loading;
  });
});

const isEmpty = computed(
  () =>
    !loading.value &&
    (!!realtimeCtx.hget('page', props.pageId, 'permanent-deletion-date') ||
      !!realtimeCtx.hget(
        'group',
        pageGroupId.value!,
        'permanent-deletion-date',
      ) ||
      (pageTitleInfo.value.status !== 'success' &&
        groupNameInfo.value.status !== 'success')),
);
</script>

<style scoped lang="scss">
.horizontal-page {
  pointer-events: auto;
  cursor: pointer;

  max-width: min(120px, 100vw / 4);

  padding-top: 2px;
  padding-right: 5px;
  padding-bottom: 2px;
  padding-left: 5px;
}
.horizontal-page.active {
  border-radius: 4px;

  background-color: rgba(255, 255, 255, 0.1);
}

.group-title {
  color: lighten(#006dd2, 23%);

  font-size: 12px;

  overflow: hidden;
  text-overflow: ellipsis;
}
.horizontal-page:hover > .group-title {
  color: lighten(lighten(#006dd2, 23%), 10%);
}

.page-title {
  margin-top: -3px;

  color: #d0d0d0;

  overflow: hidden;
  text-overflow: ellipsis;
}
.horizontal-page:hover > .page-title {
  color: lighten(#d0d0d0, 10%);
}
.page-title.encrypted {
  color: rgba(150, 150, 255, 1);
}
.page-title.empty {
  color: rgba(255, 150, 150, 1);
}
</style>
