<template>
  <a
    :href="`https://deepnotes.app/pages/${pageId}`"
    @click.prevent.stop
  >
    <q-item
      v-bind="$attrs"
      :data-page-id="pageId"
      clickable
      active-class="bg-grey-9"
      v-ripple
      @click="
        internals.pages.goToPage(pageId, {
          openInNewTab: isCtrlDown($event as MouseEvent),
        })
      "
    >
      <PageItemContent
        :icon="icon"
        :page-id="pageId"
        :prefer="prefer"
      />
    </q-item>
  </a>
</template>

<script lang="ts">
export default {
  inheritAttrs: false,
};
</script>

<script setup lang="ts">
import { isCtrlDown } from 'src/code/utils/misc';

defineProps<{
  icon: boolean;
  pageId: string;
  prefer: 'relative' | 'absolute';
}>();
</script>
