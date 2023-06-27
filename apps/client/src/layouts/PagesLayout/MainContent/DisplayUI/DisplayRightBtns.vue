<template>
  <div class="display-camera-btns">
    <DisplayBtn
      icon="mdi-magnify-remove-outline"
      :btn-size="34"
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

    <Gap style="height: 6px" />

    <DisplayBtn
      icon="mdi-image-filter-center-focus-weak"
      :btn-size="34"
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

    <Gap style="height: 8px" />

    <div style="color: white">
      {{ Math.round(page.camera.react.zoom * 100) }}%
    </div>

    <Gap style="height: 20px" />

    <DisplayBtn
      icon="mdi-undo"
      size="11px"
      :btn-size="32"
      :disable="page.react.readOnly || !page.undoRedo.react.canUndo"
      @click="page.undoRedo.undo()"
    >
      <q-tooltip
        anchor="center left"
        self="center right"
        transition-show="jump-left"
        transition-hide="jump-right"
      >
        Undo
      </q-tooltip>
    </DisplayBtn>

    <Gap style="height: 6px" />

    <DisplayBtn
      icon="mdi-redo"
      size="11px"
      :btn-size="32"
      :disable="page.react.readOnly || !page.undoRedo.react.canRedo"
      @click="page.undoRedo.redo()"
    >
      <q-tooltip
        anchor="center left"
        self="center right"
        transition-show="jump-left"
        transition-hide="jump-right"
      >
        Redo
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

  right: 12px;
  top: 53px;

  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
</style>
