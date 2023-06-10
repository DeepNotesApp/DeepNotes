<template>
  <div class="display-camera-btns">
    <div style="position: absolute; top: 90px; right: 0; color: white">
      {{ Math.round(page.camera.react.zoom * 100) }}%
    </div>

    <DisplayBtn
      icon="mdi-magnify-remove-outline"
      @click="page.camera.resetZoom()"
    >
      <q-tooltip
        anchor="center left"
        self="center right"
        transition-show="jump-left"
        transition-hide="jump-right"
      >
        Reset zoom
      </q-tooltip>
    </DisplayBtn>

    <Gap style="height: 4px" />

    <DisplayBtn
      icon="mdi-image-filter-center-focus-weak"
      @click="page.camera.fitToScreen()"
    >
      <q-tooltip
        anchor="center left"
        self="center right"
        transition-show="jump-left"
        transition-hide="jump-right"
      >
        Fit to screen
      </q-tooltip>
    </DisplayBtn>
  </div>
</template>

<script setup lang="ts">
const page = computed(() => internals.pages.react.page);
</script>

<style lang="scss" scoped>
.display-camera-btns {
  position: absolute;

  right: 8px;
  top: 58px;

  display: flex;
  flex-direction: column;

  pointer-events: none;

  @media (min-width: 840px) {
    right: 16px;
    top: 16px;
  }
}
</style>
