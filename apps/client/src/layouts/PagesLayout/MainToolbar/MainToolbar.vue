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
          min-height: 42px;
          min-width: 42px;
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
        <Gap style="width: 8px" />

        <ToolbarContent />

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
            tooltip="Pages settings"
            icon="mdi-cog"
            icon-size="28px"
            round
            @click="$q.dialog({ component: PagesSettingsDialog })"
            :disable="!uiStore().loggedIn"
          />

          <Gap style="width: 2px" />

          <ToolbarBtn
            tooltip="Account"
            icon="mdi-account"
            icon-size="30px"
            round
          >
            <AccountPopup />
          </ToolbarBtn>

          <Gap style="width: 10px" />
        </div>
      </div>

      <DeepBtn
        dense
        round
        style="
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
          min-height: 42px;
          min-width: 42px;
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
import { multiModePath } from 'src/code/utils/misc';

import AccountPopup from './AccountPopup.vue';
import NotificationsBtn from './Notifications/NotificationsBtn.vue';
import PagesSettingsDialog from './PagesSettingsDialog/PagesSettingsDialog.vue';
import ToolbarContent from './ToolbarContent.vue';

const quasarMode = process.env.MODE;
</script>

<style scoped lang="scss">
.q-header :deep() {
  transition:
    left 0.2s ease,
    right 0.2s ease;
}
</style>
