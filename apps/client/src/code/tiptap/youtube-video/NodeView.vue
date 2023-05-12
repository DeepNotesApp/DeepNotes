<template>
  <NodeViewWrapper
    as="div"
    class="youtube-wrapper"
    data-youtube-video
  >
    <iframe
      ref="youtubeElem"
      v-bind="{ ...extension.options, ...node.attrs, src: embedUrl }"
      :style="{
        'pointer-events': pointerDown ? 'none' : undefined,
      }"
    ></iframe>

    <div
      class="resize-handle"
      @pointerdown.left.stop.prevent="onResizeHandleLeftPointerDown"
      :style="{
        transform: `scale(${1 / internals.pages.react.page.camera.react.zoom})`,
      }"
    ></div>
  </NodeViewWrapper>
</template>

<script lang="ts">
export const youtubeResizing = reactive({
  active: false,
});
</script>

<script setup lang="ts">
import { listenPointerEvents, Vec2 } from '@stdlib/misc';
import { nodeViewProps } from '@tiptap/vue-3';
import { NodeViewWrapper } from '@tiptap/vue-3';
import { useEventListener } from '@vueuse/core';

import { getEmbedUrlFromYoutubeUrl } from './utils';

const props = defineProps(nodeViewProps);

const embedUrl = getEmbedUrlFromYoutubeUrl({
  ...props.extension.options,

  ...props.node.attrs,

  url: props.node.attrs.src,
});

const youtubeElem = ref<Element>();

let startSize = new Vec2();
let startPos = new Vec2();

function onResizeHandleLeftPointerDown(event: PointerEvent) {
  startSize = new Vec2(
    youtubeElem.value!.clientWidth,
    youtubeElem.value!.clientHeight,
  );
  startPos = new Vec2(event.clientX, event.clientY);

  youtubeResizing.active = true;

  listenPointerEvents(event, {
    move: (event) => {
      props.updateAttributes({
        width:
          startSize.x +
          (event.clientX - startPos.x) /
            internals.pages.react.page.camera.react.zoom,
        height:
          startSize.y +
          (event.clientY - startPos.y) /
            internals.pages.react.page.camera.react.zoom,
      });
    },
    up: () => {
      setTimeout(() => {
        youtubeResizing.active = false;
      });
    },
  });
}

const pointerDown = ref(false);

useEventListener(
  'pointerdown',
  (event) => {
    pointerDown.value = true;

    listenPointerEvents(event, {
      up: () => (pointerDown.value = false),
    });
  },
  { capture: true },
);
</script>

<style lang="scss" scoped>
.youtube-wrapper {
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
