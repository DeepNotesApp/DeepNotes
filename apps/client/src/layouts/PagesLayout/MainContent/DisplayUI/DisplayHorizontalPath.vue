<template>
  <div
    style="
      position: absolute;
      left: 12px;
      right: 12px;
      top: 7px;
      font-size: 13px;
      white-space: nowrap;

      text-align: left;
      direction: rtl;
    "
  >
    <div style="display: inline-block">
      <div style="display: flex; gap: 4px; direction: ltr">
        <template
          v-for="(pageId, index) in internals.pages.react.pathPageIds.slice(
            0,
            internals.pages.react.pageIndex + 1,
          )"
          :key="pageId"
        >
          <span
            v-if="index > 0"
            style="color: #808080"
          >
            >
          </span>

          <DisplayHorizontalPage :page-id="pageId" />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DisplayHorizontalPage from './DisplayHorizontalPage.vue';
</script>
