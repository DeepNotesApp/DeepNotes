<template>
  <template v-if="!uiStore().loggedIn && uiStore().width >= BREAKPOINT_MD_MIN">
    <DeepBtn
      label="Login"
      flat
      class="toolbar-btn"
      :to="{ name: 'login' }"
    />

    <div style="width: 16px"></div>

    <DeepBtn
      label="Start for free"
      class="toolbar-btn"
      color="primary"
      :to="{ name: 'register' }"
    />
  </template>

  <template v-if="uiStore().loggedIn">
    <DeepBtn
      v-if="uiStore().width >= BREAKPOINT_MD_MIN"
      color="primary"
      :href="multiModePath('/pages')"
      style="height: 46px"
    >
      <span style="font-weight: bold">Go to pages</span>
      <span
        style="
          position: relative;
          top: -1px;
          margin-left: 3px;
          font-weight: bold;
          font-size: 1.3em;
        "
      >
        →
      </span>
    </DeepBtn>

    <DeepBtn
      v-if="uiStore().width < BREAKPOINT_MD_MIN"
      class="toolbar-btn"
      color="primary"
      round
      :href="multiModePath('/pages')"
    >
      <span style="font-weight: bold; font-size: 1.3em"> → </span>
    </DeepBtn>
  </template>
</template>

<script setup lang="ts">
import { BREAKPOINT_MD_MIN } from '@stdlib/misc';
import { multiModePath } from 'src/code/utils/misc';
</script>
