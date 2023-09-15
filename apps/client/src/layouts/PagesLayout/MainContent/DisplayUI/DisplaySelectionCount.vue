<template>
  <div
    v-if="page.selection.react.elems.length > 0"
    class="selection-count"
  >
    {{ page.selection.react.elems.length }}
    item{{ page.selection.react.elems.length > 1 ? 's' : '' }} selected
  </div>
</template>

<script setup lang="ts">
const page = computed(() => internals.pages.react.page);
</script>

<style scoped lang="scss">
.selection-count {
  position: absolute;

  bottom: 12px;
  right: 14px;

  font-size: 12px;
  color: lighten(#006dd2, 23%);

  pointer-events: none;
}
</style>
