<template>
  <q-toolbar
    style="
      padding: 0;
      background-color: #141414;
      min-height: 0;
      overflow: hidden;
    "
  >
    <DeepBtn
      flat
      style="width: 100%; height: 32px; min-height: 0; border-radius: 0"
      no-caps
      @click="negateProp(uiStore(), 'recentPagesExpanded')"
    >
      <div style="width: 100%; height: 0; display: flex; align-items: center">
        <q-avatar style="margin-top: -1px; margin-left: -8px">
          <q-icon
            name="mdi-history"
            size="20px"
          />
        </q-avatar>

        <q-toolbar-title
          style="
            margin-left: -2px;
            text-align: left;
            color: rgba(255, 255, 255, 0.85);
            font-size: 13.5px;
          "
        >
          Recent pages
        </q-toolbar-title>
      </div>
    </DeepBtn>

    <q-btn
      icon="mdi-menu"
      style="
        position: absolute;
        right: 4px;
        width: 32px;
        height: 32px;
        min-height: 0;
      "
    >
      <q-menu auto-close>
        <q-list>
          <q-item
            clickable
            @click="clearRecentPages"
            :disable="recentPageIds.length === 0"
          >
            <q-item-section avatar>
              <q-icon name="mdi-close" />
            </q-item-section>

            <q-item-section>
              <q-item-label>Clear recent pages</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
  </q-toolbar>

  <q-list
    ref="listRef"
    style="height: 0; overflow-x: hidden; overflow-y: auto"
    :style="{
      flex: uiStore().recentPagesExpanded ? uiStore().recentPagesWeight : '0',
    }"
  >
    <q-item v-if="recentPageIds.length === 0">
      <q-item-section>
        <q-item-label
          style="color: rgba(255, 255, 255, 0.7); font-size: 13.5px"
        >
          No recent pages.
        </q-item-label>
      </q-item-section>
    </q-item>

    <div
      v-for="pageId in recentPageIds"
      :key="pageId"
      class="recent-page"
    >
      <PageItem
        icon
        :page-id="pageId"
        :active="pageId === internals.pages.react.pageId"
        prefer="absolute"
        class="recent-pages"
      />

      <DeepBtn
        icon="mdi-close"
        size="14px"
        round
        flat
        class="remove-btn"
        title="Remove from recent pages"
        @click.stop="removeRecentPage(pageId)"
      />
    </div>
  </q-list>

  <div
    style="position: relative"
    v-if="uiStore().recentPagesExpanded && uiStore().selectedPagesExpanded"
  >
    <div
      class="resize-handle"
      @pointerdown="resizeHandlePointerDown"
      @dblclick="resizeHandleDoubleClick"
    ></div>
  </div>

  <q-separator style="background-color: rgba(255, 255, 255, 0.15) !important" />
</template>

<script setup lang="ts">
import { listenPointerEvents, map, negateProp } from '@stdlib/misc';
import { pull } from 'lodash';
import { useRealtimeContext } from 'src/code/realtime/context';
import { asyncDialog, handleError } from 'src/code/utils/misc';
import type { ComponentPublicInstance } from 'vue';

const realtimeCtx = useRealtimeContext();

const recentPageIds = computed(() =>
  internals.pages.react.recentPageIds.filter((pageId) =>
    realtimeCtx.hget('page', pageId, 'exists'),
  ),
);

const listRef = ref<ComponentPublicInstance>();

function resizeHandlePointerDown(downEvent: PointerEvent) {
  listenPointerEvents(downEvent, {
    move(moveEvent) {
      const clientRect = listRef.value!.$el.getBoundingClientRect();

      const othersHeight = uiStore().height - clientRect.height - 32 * 3 - 2;

      const othersWeight =
        (uiStore().currentPathExpanded ? uiStore().currentPathWeight : 0) +
        (uiStore().selectedPagesExpanded ? uiStore().selectedPagesWeight : 0);

      const myNewHeight = moveEvent.clientY - clientRect.y;

      const myNewWeight = map(myNewHeight, 0, othersHeight, 0, othersWeight);

      uiStore().selectedPagesWeight -=
        myNewWeight - uiStore().recentPagesWeight;
      uiStore().recentPagesWeight = myNewWeight;

      uiStore().normalizeWeights();
    },
  });
}

async function clearRecentPages() {
  try {
    await asyncDialog({
      title: 'Clear recent pages',
      message: 'Are you sure you want to clear recent pages?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    await trpcClient.users.pages.clearRecentPages.mutate();

    internals.pages.recentPageIdsKeepOverride = true;
    internals.pages.react.recentPageIdsOverride = [];
  } catch (error) {
    handleError(error);
  }
}

async function removeRecentPage(pageId: string) {
  try {
    await trpcClient.users.pages.removeRecentPage.mutate({ pageId });

    internals.pages.recentPageIdsKeepOverride = true;
    internals.pages.react.recentPageIdsOverride = recentPageIds.value.slice();
    pull(internals.pages.react.recentPageIdsOverride, pageId);
  } catch (error) {
    handleError(error);
  }
}

function resizeHandleDoubleClick() {
  const avgWeight =
    (uiStore().recentPagesWeight + uiStore().selectedPagesWeight) / 2;

  uiStore().recentPagesWeight = avgWeight;
  uiStore().selectedPagesWeight = avgWeight;
}
</script>

<style scoped lang="scss">
.recent-page {
  position: relative;

  > .remove-btn {
    position: absolute;

    top: 50%;
    right: -6px;

    transform: translate(-50%, -50%);

    min-width: 30px;
    min-height: 30px;
    width: 30px;
    height: 30px;

    opacity: 0;
    transition: opacity 0.2s;
  }
}

.recent-page:hover > .remove-btn {
  opacity: 1;
}

.resize-handle {
  position: absolute;
  left: 0;
  top: -6px;
  right: 0;
  bottom: -6px;
  cursor: ns-resize;
  z-index: 2147483647;

  opacity: 0;
  background-color: white;

  transition: opacity 0.2s;
}
.resize-handle:hover {
  opacity: 0.4;
}
</style>
