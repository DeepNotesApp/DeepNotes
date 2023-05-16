<template>
  <polygon
    :points="points"
    class="arrow-link-zone"
    :style="{
      opacity: pointerOver ? 0.3 : 0,
    }"
    @pointerover="pointerOver = true"
    @pointerout="pointerOver = false"
    @pointerup.left="onLeftPointerUp"
  ></polygon>
</template>

<script setup lang="ts">
import type { IVec2 } from '@stdlib/misc';
import { keyDown } from 'src/code/pages/composables/use-key-state-tracking';
import type { PageNote } from 'src/code/pages/page/notes/note';
import type { Page } from 'src/code/pages/page/page';

const props = defineProps<{
  points: string;
  anchor: IVec2 | null;
}>();

const page = inject<Page>('page')!;
const note = inject<PageNote>('note')!;

const pointerOver = ref(false);

watchEffect(() => {
  if (pointerOver.value && !keyDown['Control']) {
    page.arrowCreation.fakeArrow.react.collab[
      `${page.arrowCreation.fakeArrow.react.looseEndpoint!}Anchor`
    ] = props.anchor;

    page.arrowCreation.fakeArrow.react.collab[
      page.arrowCreation.fakeArrow.react.looseEndpoint!
    ] = note.id;
  } else {
    page.arrowCreation.fakeArrow.react.collab[
      `${page.arrowCreation.fakeArrow.react.looseEndpoint!}Anchor`
    ] = null;

    page.arrowCreation.fakeArrow.react.collab[
      page.arrowCreation.fakeArrow.react.looseEndpoint!
    ] = '';
  }
});

function onLeftPointerUp() {
  if (!keyDown['Control']) {
    page.arrowCreation.finish({ note, anchor: props.anchor });
  }
}
</script>

<style scoped lang="scss">
.arrow-link-zone {
  fill: #42a5f5;

  opacity: 0;
}
</style>
