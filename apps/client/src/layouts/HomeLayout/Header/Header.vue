<template>
  <q-header
    ref="headerRef"
    style="background-color: #181818"
  >
    <q-toolbar
      style="
        height: 64px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        padding: 0;
      "
    >
      <ResponsiveContainer style="display: flex; align-items: center">
        <LeftHeaderMenu></LeftHeaderMenu>

        <q-toolbar-title style="overflow: visible; padding: 0px; flex: none">
          <router-link
            :to="
              isIncluded(quasarMode, ['ssr', 'spa']) ? { name: 'home' } : '#'
            "
            style="display: flex; align-items: center"
          >
            <img
              src="~assets/white-logo-outline.png"
              style="width: 39px; height: 39px; opacity: 95%"
            />

            <div style="width: 8px"></div>

            <div
              style="
                font-size: 20px;
                font-weight: bold;
                color: rgba(255, 255, 255, 0.9);
                position: relative;
              "
            >
              DeepNotes

              <q-badge
                floating
                rounded
                style="top: -2px; right: -20px"
              >
                Beta
              </q-badge>
            </div>
          </router-link>
        </q-toolbar-title>

        <template v-if="uiStore().width >= BREAKPOINT_LG_MIN">
          <Gap style="width: 32px" />

          <DeepBtn
            label="Pricing"
            flat
            class="toolbar-btn"
            :to="{ name: 'pricing' }"
          />

          <Gap style="width: 12px" />

          <DeepBtn
            label="Download"
            flat
            class="toolbar-btn"
            :to="{ name: 'download' }"
            disable
          >
            <q-tooltip
              anchor="top middle"
              self="bottom middle"
              transition-show="jump-down"
              transition-hide="jump-up"
            >
              Coming soon
            </q-tooltip>
          </DeepBtn>

          <Gap style="width: 12px" />

          <DeepBtn
            label="Whitepaper"
            flat
            class="toolbar-btn"
            :to="{ name: 'whitepaper' }"
          />
        </template>

        <q-space />

        <RightButtons></RightButtons>
        <RightMenu></RightMenu>
      </ResponsiveContainer>
    </q-toolbar>
  </q-header>
</template>

<script setup lang="ts">
import { BREAKPOINT_LG_MIN, isIncluded } from '@stdlib/misc';
import { useResizeObserver } from 'src/code/utils.universal';
import LeftHeaderMenu from 'src/pages/home/Account/AccountMenu.vue';
import type { ComponentPublicInstance } from 'vue';

import RightButtons from './RightButtons/RightButtons.vue';
import RightMenu from './RightButtons/RightMenu.vue';

const quasarMode = process.env.MODE;

const headerRef = ref<ComponentPublicInstance>();

useResizeObserver(
  () => headerRef.value!.$el,
  (entry) => {
    uiStore().headerHeight = entry.contentRect.height;
  },
);
</script>
