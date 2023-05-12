<template>
  <svg
    v-if="page.arrowCreation.react.active"
    class="arrow-link-zones"
    width="100%"
    height="100%"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
  >
    <polygon
      points="0,0 100,0 75,25 25,25"
      class="arrow-link-zone"
      @pointerup.left="
        page.arrowCreation.finish({ note, anchor: new Vec2(0, -1) })
      "
    ></polygon>

    <polygon
      points="0,0 25,25 25,75 0,100"
      class="arrow-link-zone"
      @pointerup.left="
        page.arrowCreation.finish({ note, anchor: new Vec2(-1, 0) })
      "
    ></polygon>

    <polygon
      points="0,100 25,75 75,75 100,100"
      class="arrow-link-zone"
      @pointerup.left="
        page.arrowCreation.finish({ note, anchor: new Vec2(0, 1) })
      "
    ></polygon>

    <polygon
      points="100,100 75,75 75,25 100,0"
      class="arrow-link-zone"
      @pointerup.left="
        page.arrowCreation.finish({ note, anchor: new Vec2(1, 0) })
      "
    ></polygon>

    <polygon
      points="25,25 75,25 75,75 25,75"
      class="arrow-link-zone"
      @pointerup.left="page.arrowCreation.finish({ note, anchor: null })"
    ></polygon>
  </svg>
</template>

<script setup lang="ts">
import { Vec2 } from '@stdlib/misc';
import type { PageNote } from 'src/code/pages/page/notes/note';
import type { Page } from 'src/code/pages/page/page';

const page = inject<Page>('page')!;
const note = inject<PageNote>('note')!;
</script>

<style scoped lang="scss">
.arrow-link-zones {
  position: absolute;

  inset: 0;

  overflow: visible;
}

.arrow-link-zone {
  fill: #42a5f5;

  opacity: 0;
}
.arrow-link-zone:hover {
  opacity: 0.3;
}
</style>
