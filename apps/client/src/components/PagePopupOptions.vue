<template>
  <DeepBtn
    icon="mdi-dots-vertical"
    round
    flat
    style="min-width: 0; min-height: 0; width: 32px; height: 32px"
    @click.stop
  >
    <q-menu
      v-bind="menuProps"
      auto-close
      @before-show="beforeShow"
    >
      <q-list>
        <q-item
          v-if="internals.pages.react.recentPageIds.includes(pageId)"
          clickable
          v-ripple
          @click="removeRecentPages([pageId])"
        >
          <q-item-section avatar>
            <q-icon name="mdi-trash-can" />
          </q-item-section>

          <q-item-section>
            <q-item-label>Remove from recent pages</q-item-label>
          </q-item-section>
        </q-item>

        <q-item
          v-if="pageFavorited"
          clickable
          v-ripple
          @click="removeFavoritePages([pageId])"
        >
          <q-item-section avatar>
            <q-icon name="mdi-star" />
          </q-item-section>

          <q-item-section>
            <q-item-label>Remove from favorite pages</q-item-label>
          </q-item-section>
        </q-item>
        <q-item
          v-else
          clickable
          v-ripple
          @click="addFavoritePages([pageId])"
        >
          <q-item-section avatar>
            <q-icon name="mdi-star" />
          </q-item-section>

          <q-item-section>
            <q-item-label>Add to favorite pages</q-item-label>
          </q-item-section>
        </q-item>

        <q-item
          v-if="pageSelected"
          clickable
          v-ripple
          @click="deselectPage"
        >
          <q-item-section avatar>
            <q-icon name="mdi-selection-multiple" />
          </q-item-section>

          <q-item-section>
            <q-item-label>Remove from selected pages</q-item-label>
          </q-item-section>
        </q-item>
        <q-item
          v-else
          clickable
          v-ripple
          @click="selectPage"
        >
          <q-item-section avatar>
            <q-icon name="mdi-selection-multiple" />
          </q-item-section>

          <q-item-section>
            <q-item-label>Add to selected pages</q-item-label>
          </q-item-section>
        </q-item>

        <slot></slot>
      </q-list>
    </q-menu>
  </DeepBtn>
</template>

<script setup lang="ts">
import type { QMenuProps } from 'quasar';
import { addFavoritePages } from 'src/code/areas/api-interface/users/add-favorite-pages';
import { removeFavoritePages } from 'src/code/areas/api-interface/users/remove-favorite-pages';
import { removeRecentPages } from 'src/code/areas/api-interface/users/remove-recent-pages';
import { pageSelectionStore } from 'src/stores/page-selection';

import type { DeepBtnProps } from './DeepBtn.vue';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Props extends DeepBtnProps {
  pageId: string;

  menuProps?: QMenuProps;
}

const props = defineProps<Props>();

const pageFavorited = ref(false);
const pageSelected = ref(false);

function beforeShow() {
  pageFavorited.value = internals.pages.react.favoritePageIds.includes(
    props.pageId,
  );
  pageSelected.value = pageSelectionStore().selectedPages.has(props.pageId);
}

function selectPage() {
  pageSelectionStore().selectedPages.add(props.pageId);

  $quasar().notify({
    message: 'Page added to selection.',
    color: 'positive',
    timeout: 1000,
  });
}

function deselectPage() {
  pageSelectionStore().selectedPages.delete(props.pageId);

  $quasar().notify({
    message: 'Page removed from selection.',
    color: 'negative',
    timeout: 1000,
  });
}
</script>
