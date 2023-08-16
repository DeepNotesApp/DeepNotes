<template>
  <q-layout
    class="pages-layout"
    view="lHr lpR fFf"
  >
    <template v-if="!pagesStore().loading">
      <MainToolbar />

      <LeftSidebar />
      <RightSidebar />
    </template>

    <MainContent />

    <router-view />
  </q-layout>

  <TableContextMenu v-if="!pagesStore().loading" />

  <LoadingOverlay v-if="pagesStore().loading" />
</template>

<script setup lang="ts">
import { sleep } from '@stdlib/misc';
import { watchUntilTrue } from '@stdlib/vue';
import { useEditingOnTyping } from 'src/code/pages/composables/use-editing-on-typing';
import { useElementPasting } from 'src/code/pages/composables/use-element-pasting';
import { useImagePasting } from 'src/code/pages/composables/use-image-pasting';
import { useKeyStateTracking } from 'src/code/pages/composables/use-key-state-tracking';
import { useKeyboardShortcuts } from 'src/code/pages/composables/use-keyboard-shortcuts';
import { useMiddleClickPastePrevention } from 'src/code/pages/composables/use-middle-click-paste-prevention';
import { usePageNavigationInterception } from 'src/code/pages/composables/use-page-navigation-interception';
import { useTableContextMenu } from 'src/code/pages/composables/use-table-context-menu';
import { useTouchscreenPointerCaptureRelease } from 'src/code/pages/composables/use-touchscreen-pointer-capture-release';
import { useWindowResizeListener } from 'src/code/pages/composables/use-window-resize-listener';
import LeftSidebar from 'src/layouts/PagesLayout/LeftSidebar/LeftSidebar.vue';
import MainContent from 'src/layouts/PagesLayout/MainContent/MainContent.vue';
import MainToolbar from 'src/layouts/PagesLayout/MainToolbar/MainToolbar.vue';
import RightSidebar from 'src/layouts/PagesLayout/RightSidebar/RightSidebar.vue';

import TableContextMenu from './TableContextMenu.vue';

// Pages application

onMounted(async () => {
  await watchUntilTrue(() => !appStore().loading);

  await internals.pages.loadUserData();
});

onBeforeUnmount(() => {
  internals.pages.destroy();
  internals.pages = undefined as any;
});

if (process.env.CLIENT) {
  useTouchscreenPointerCaptureRelease();
  useKeyboardShortcuts();
  useEditingOnTyping();
  useElementPasting();
  useImagePasting();
  usePageNavigationInterception();
  useMiddleClickPastePrevention();
  useTableContextMenu();
  useWindowResizeListener();
  useKeyStateTracking();
}

watch(
  [
    () => internals.pages.react.tutorialStep,
    () => uiStore().rightSidebarExpanded,
  ],
  async () => {
    await sleep();

    if (internals.pages.react.isNewUser) {
      if (internals.pages.react.tutorialStep === 2) {
        document.querySelector('.collapsible-checkbox')?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      } else if (internals.pages.react.tutorialStep === 3) {
        document.querySelector('.container-checkbox')?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      } else if (internals.pages.react.tutorialStep === 4) {
        document.querySelector('.new-page-button')?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      } else if (internals.pages.react.tutorialStep === 6) {
        $quasar().notify({
          html: true,
          message: "These are basics of DeepNotes.<br/>You're good to go!",
          color: 'deep-purple-7',
        });
      }
    }
  },
);
</script>

<style>
* {
  user-select: none;
}

body {
  overscroll-behavior-y: contain; /* Prevent pull-to-refresh */

  overflow: hidden;

  position: fixed;
}
</style>

<style lang="scss" scoped>
.pages-layout :deep() {
  .q-drawer {
    &.q-drawer--mini {
      .q-item {
        justify-content: normal !important;
        padding-left: 16px !important;
      }

      ::-webkit-scrollbar {
        width: 8px;
      }
    }

    .q-item {
      justify-content: normal !important;
      padding-left: 16px !important;
    }
  }

  .q-page-container {
    transition: padding-left 0.2s ease, padding-right 0.2s ease;
  }
}
</style>
