<template>
  <NodeViewWrapper
    as="span"
    class="image-wrapper"
  >
    <img
      ref="imageElem"
      v-bind="node.attrs"
      draggable="true"
      data-drag-handle
    />

    <div
      v-if="!internals.pages.react.page.react.readOnly"
      class="resize-handle"
      @pointerdown.left.stop.prevent="onResizeHandleLeftPointerDown"
      :style="{
        transform: `scale(${1 / internals.pages.react.page.camera.react.zoom})`,
      }"
    ></div>
  </NodeViewWrapper>
</template>

<script lang="ts">
export const imageResizing = {
  active: false,
};
</script>

<script setup lang="ts">
import { listenPointerEvents } from '@stdlib/misc';
import { nodeViewProps } from '@tiptap/vue-3';
import { NodeViewWrapper } from '@tiptap/vue-3';

const props = defineProps(nodeViewProps);

const imageElem = ref<Element>();

let startWidth: number;
let startPos: number;

function onResizeHandleLeftPointerDown(event: PointerEvent) {
  startWidth = imageElem.value!.clientWidth;
  startPos = event.clientX;

  imageResizing.active = true;

  listenPointerEvents(event, {
    move: (event) => {
      props.updateAttributes({
        width:
          startWidth +
          (event.clientX - startPos) /
            internals.pages.react.page.camera.react.zoom,
      });
    },
    up: () => {
      setTimeout(() => {
        imageResizing.active = false;
      });
    },
  });
}
</script>

<style lang="scss" scoped>
.image-wrapper {
  display: inline-flex;
  flex-grow: 0;

  position: relative;

  > .resize-handle {
    position: absolute;

    border: 1px solid #3259a5;
    border-radius: 9999px;

    right: -6px;
    bottom: -6px;
    width: 12px;
    height: 12px;

    background-color: white;

    transition: opacity 0.3s ease;

    opacity: 0;

    cursor: nwse-resize;
  }

  &:hover > .resize-handle {
    opacity: 1;
  }
}
</style>
