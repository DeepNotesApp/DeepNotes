<template>
  <div
    v-if="uiStore().width < 840"
    style="
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      pointer-events: none;
    "
  >
    <template
      v-if="
        uiStore().width >= 570 ||
        (uiStore().width < 570 &&
          !uiStore().leftSidebarExpanded &&
          !uiStore().rightSidebarExpanded)
      "
    >
      <div
        style="
          position: absolute;
          left: 60px;
          top: 8px;
          pointer-events: none;
          display: flex;
        "
      >
        <DisplayBtn
          icon="mdi-hammer-wrench"
          tooltip="Basic"
        >
          <q-menu
            style="padding: 1px 5px"
            :offset="[0, 4]"
            auto-close
          >
            <BasicBtns popup />
          </q-menu>
        </DisplayBtn>

        <Gap style="width: 4px" />

        <DisplayBtn
          icon="mdi-format-color-text"
          tooltip="Formatting"
        >
          <q-menu
            style="padding: 1px 5px"
            :offset="[0, 4]"
            auto-close
          >
            <FormattingBtns popup />
          </q-menu>
        </DisplayBtn>

        <Gap style="width: 4px" />

        <DisplayBtn
          icon="mdi-format-list-bulleted"
          tooltip="Objects"
        >
          <q-menu
            style="padding: 1px 5px"
            :offset="[0, 4]"
            auto-close
          >
            <ObjectBtns popup />
          </q-menu>
        </DisplayBtn>

        <Gap style="width: 4px" />

        <DisplayBtn
          icon="mdi-align-horizontal-left"
          tooltip="Alignment"
        >
          <q-menu
            style="padding: 1px 5px"
            :offset="[0, 4]"
            auto-close
          >
            <AlignmentBtns popup />
          </q-menu>
        </DisplayBtn>
      </div>

      <DisplayBtn
        icon="mdi-menu"
        tooltip="Menu"
        style="position: absolute; right: 60px; top: 8px"
      >
        <AccountPopup>
          <q-item
            v-if="isIncluded(quasarMode, ['ssr', 'spa'])"
            clickable
            v-close-popup
            :href="multiModePath('/')"
          >
            <q-item-section avatar>
              <q-icon name="mdi-home" />
            </q-item-section>
            <q-item-section>Home</q-item-section>
          </q-item>

          <q-item clickable>
            <q-item-section avatar>
              <q-icon name="mdi-bell">
                <NotificationsBadge />
              </q-icon>
            </q-item-section>

            <q-item-section>Notifications</q-item-section>

            <NotificationsPopup />
          </q-item>

          <q-item
            clickable
            v-close-popup
            @click="$q.dialog({ component: PagesSettingsDialog })"
          >
            <q-item-section avatar>
              <q-icon name="mdi-cog" />
            </q-item-section>

            <q-item-section>Pages settings</q-item-section>
          </q-item>
        </AccountPopup>
      </DisplayBtn>
    </template>

    <DeepBtn
      v-if="!(uiStore().rightSidebarExpanded && uiStore().width < 458)"
      round
      style="
        position: absolute;
        left: 0px;
        top: 6px;
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        min-height: 42px;
        min-width: 42px;
        pointer-events: auto;
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

    <DeepBtn
      v-if="!(uiStore().leftSidebarExpanded && uiStore().width < 458)"
      dense
      round
      style="
        position: absolute;
        right: 0px;
        top: 6px;
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
        min-height: 42px;
        min-width: 42px;
        pointer-events: auto;
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
  </div>
</template>

<script setup lang="ts">
import { isIncluded } from '@stdlib/misc';
import { multiModePath } from 'src/code/utils/misc';

import AccountPopup from '../../MainToolbar/AccountPopup.vue';
import AlignmentBtns from '../../MainToolbar/AlignmentBtns.vue';
import BasicBtns from '../../MainToolbar/BasicBtns.vue';
import FormattingBtns from '../../MainToolbar/FormattingBtns.vue';
import NotificationsBadge from '../../MainToolbar/Notifications/NotificationsBadge.vue';
import NotificationsPopup from '../../MainToolbar/Notifications/NotificationsPopup.vue';
import ObjectBtns from '../../MainToolbar/ObjectBtns.vue';
import PagesSettingsDialog from '../../MainToolbar/PagesSettingsDialog/PagesSettingsDialog.vue';

const quasarMode = process.env.MODE;
</script>
