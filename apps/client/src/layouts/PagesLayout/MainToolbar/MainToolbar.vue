<template>
  <q-header
    elevated
    class="d-none d-md-block"
    v-show="uiStore().width >= 840"
    style="
      background-color: transparent;
      border-bottom: 1px solid rgba(255, 255, 255, 0.16);
    "
  >
    <q-toolbar
      class="bg-grey-10"
      style="padding: 0"
    >
      <DeepBtn
        round
        style="
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
          min-height: 50px;
          min-width: 50px;
        "
        class="bg-grey-9"
        @click="uiStore().toggleLeftSidebar()"
      >
        <q-icon
          style="position: relative; left: -2px"
          :name="
            uiStore().leftSidebarExpanded
              ? 'mdi-chevron-left'
              : 'mdi-chevron-right'
          "
        />
      </DeepBtn>

      <div style="flex: 1; width: 0; display: flex">
        <div
          ref="toolbarRef"
          style="
            flex: 1;
            width: 0;
            display: flex;
            overflow: hidden;
            align-items: center;
          "
        >
          <Gap style="width: 8px" />

          <ToolbarBtnContainer
            :toolbar-width="toolbarWidth"
            :breakpoint="393"
            tooltip="Basic"
            icon="mdi-hammer-wrench"
          >
            <BasicBtns />
          </ToolbarBtnContainer>

          <q-separator
            vertical
            style="margin: 6px 7px"
          />

          <ToolbarBtnContainer
            :toolbar-width="toolbarWidth"
            :breakpoint="917"
            tooltip="Formatting"
            icon="mdi-format-color-text"
          >
            <FormattingBtns />
          </ToolbarBtnContainer>

          <q-separator
            vertical
            style="margin: 6px 7px"
          />

          <ToolbarBtnContainer
            :toolbar-width="toolbarWidth"
            :breakpoint="1465"
            tooltip="Objects"
            icon="mdi-format-list-numbered"
          >
            <ObjectBtns />
          </ToolbarBtnContainer>

          <q-separator
            vertical
            style="margin: 6px 7px"
          />

          <ToolbarBtnContainer
            :toolbar-width="toolbarWidth"
            :breakpoint="1620"
            tooltip="Alignment"
            icon="mdi-align-horizontal-left"
          >
            <AlignmentBtns />
          </ToolbarBtnContainer>
        </div>

        <Gap style="width: 8px" />

        <q-separator
          vertical
          style="margin-top: -5px; margin-bottom: -5px"
        />

        <Gap style="width: 8px" />

        <div style="display: flex; align-items: center">
          <template v-if="isIncluded(quasarMode, ['ssr', 'spa'])">
            <ToolbarBtn
              tooltip="Home"
              icon="mdi-home"
              icon-size="28px"
              round
              :href="multiModePath('/')"
            />

            <Gap style="width: 2px" />
          </template>

          <NotificationsBtn />

          <Gap style="width: 2px" />

          <ToolbarBtn
            tooltip="Settings"
            icon="mdi-cog"
            icon-size="28px"
            round
            @click="$q.dialog({ component: UserSettingsDialog })"
            :disable="!uiStore().loggedIn"
          />

          <Gap style="width: 2px" />

          <AccountPopup />

          <Gap style="width: 10px" />
        </div>
      </div>

      <DeepBtn
        dense
        round
        style="
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
          min-height: 50px;
          min-width: 50px;
        "
        class="bg-grey-9"
        @click="uiStore().toggleRightSidebar()"
      >
        <q-icon
          :name="
            uiStore().rightSidebarExpanded
              ? 'mdi-chevron-right'
              : 'mdi-chevron-left'
          "
          style="position: relative; right: -2px"
        />
      </DeepBtn>
    </q-toolbar>
  </q-header>
</template>

<script setup lang="ts">
import { isIncluded } from '@stdlib/misc';
import { multiModePath, useResizeObserver } from 'src/code/utils.universal';

import AccountPopup from './AccountPopup.vue';
import AlignmentBtns from './AlignmentBtns.vue';
import BasicBtns from './BasicBtns.vue';
import FormattingBtns from './FormattingBtns.vue';
import NotificationsBtn from './Notifications/NotificationsBtn.vue';
import ObjectBtns from './ObjectBtns.vue';
import ToolbarBtnContainer from './ToolbarBtnContainer.vue';
import UserSettingsDialog from './UserSettingsDialog/UserSettingsDialog.vue';

const quasarMode = process.env.MODE;

const toolbarRef = ref<HTMLElement>();
const toolbarWidth = ref(0);

useResizeObserver(
  () => toolbarRef.value!,
  (entry) => {
    toolbarWidth.value = entry.contentRect.width;
  },
);
</script>

<style scoped lang="scss">
.q-header :deep() {
  transition: left 0.2s ease, right 0.2s ease;
}
</style>
