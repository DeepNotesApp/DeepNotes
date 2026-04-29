<script lang="ts">
import { reactive } from "vue";

/** True while dragging the resize handle — use for router guards / navigation parity with legacy. */
export const youtubeResizing = reactive({
  active: false,
});
</script>

<script setup lang="ts">
import { getEmbedUrlFromYoutubeUrl } from "@tiptap/extension-youtube";
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { computed, ref } from "vue";

const props = defineProps(nodeViewProps);

const iframeRef = ref<HTMLIFrameElement | null>(null);
const pointerBlock = ref(false);

const wrapperTag = computed(() =>
  props.extension.options.inline ? "span" : "div",
);

const embedUrl = computed(() => {
  const src = props.node.attrs.src as string | null;
  if (src == null || src === "") {
    return null;
  }
  const o = props.extension.options;
  return getEmbedUrlFromYoutubeUrl({
    url: src,
    allowFullscreen: o.allowFullscreen,
    autoplay: o.autoplay,
    ccLanguage: o.ccLanguage,
    ccLoadPolicy: o.ccLoadPolicy,
    controls: o.controls,
    disableKBcontrols: o.disableKBcontrols,
    enableIFrameApi: o.enableIFrameApi,
    endTime: o.endTime,
    interfaceLanguage: o.interfaceLanguage,
    ivLoadPolicy: o.ivLoadPolicy,
    loop: o.loop,
    modestBranding: o.modestBranding,
    nocookie: o.nocookie,
    origin: o.origin,
    playlist: o.playlist,
    progressBarColor: o.progressBarColor,
    startAt: (props.node.attrs.start as number) || 0,
    rel: o.rel,
  });
});

const widthPx = computed(() => {
  const w = props.node.attrs.width as number | undefined;
  return w ?? props.extension.options.width;
});

const heightPx = computed(() => {
  const h = props.node.attrs.height as number | undefined;
  return h ?? props.extension.options.height;
});

/** Legacy canvas zoom was applied here; single-column editor uses 1. */
const editorZoom = 1;

function listenWindowPointer(
  initial: PointerEvent,
  handlers: { move: (e: PointerEvent) => void; up: () => void },
) {
  const id = initial.pointerId;
  try {
    (initial.target as HTMLElement | undefined)?.setPointerCapture?.(id);
  } catch {
    /* ignore */
  }
  const onMove = (e: PointerEvent) => handlers.move(e);
  const done = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", done);
    window.removeEventListener("pointercancel", done);
    handlers.up();
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", done);
  window.addEventListener("pointercancel", done);
}

function onIframePointerDown() {
  pointerBlock.value = true;
  const done = () => {
    pointerBlock.value = false;
    window.removeEventListener("pointerup", done);
    window.removeEventListener("pointercancel", done);
  };
  window.addEventListener("pointerup", done);
  window.addEventListener("pointercancel", done);
}

function onResizePointerDown(event: PointerEvent) {
  if (!props.editor.isEditable) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  const el = iframeRef.value;
  if (el == null) {
    return;
  }
  const startW = el.clientWidth;
  const startH = el.clientHeight;
  const startX = event.clientX;
  const startY = event.clientY;

  youtubeResizing.active = true;

  listenWindowPointer(event, {
    move: (e) => {
      props.updateAttributes({
        width: Math.round(
          Math.max(120, startW + (e.clientX - startX) / editorZoom),
        ),
        height: Math.round(
          Math.max(68, startH + (e.clientY - startY) / editorZoom),
        ),
      });
    },
    up: () => {
      setTimeout(() => {
        youtubeResizing.active = false;
      }, 0);
    },
  });
}
</script>

<template>
  <NodeViewWrapper
    :as="wrapperTag"
    class="youtube-wrapper"
    data-youtube-video
  >
    <iframe
      v-if="embedUrl"
      ref="iframeRef"
      :src="embedUrl"
      :width="widthPx"
      :height="heightPx"
      class="youtube-iframe"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerpolicy="strict-origin-when-cross-origin"
      allowfullscreen
      loading="lazy"
      :style="{
        pointerEvents: pointerBlock ? 'none' : undefined,
      }"
      @pointerdown="onIframePointerDown"
    />
    <span v-else class="youtube-invalid">Invalid or missing YouTube URL</span>

    <div
      v-if="editor.isEditable"
      class="resize-handle"
      @pointerdown.left.stop.prevent="onResizePointerDown"
    />
  </NodeViewWrapper>
</template>

<style scoped>
.youtube-wrapper {
  display: inline-flex;
  flex-grow: 0;
  position: relative;
  vertical-align: bottom;
  max-width: 100%;
}

.youtube-iframe {
  display: block;
  border: 0;
  border-radius: 0.375rem;
  max-width: 100%;
}

.youtube-invalid {
  font-size: 0.75rem;
  line-height: 1.25rem;
  color: var(--muted-foreground);
}

.resize-handle {
  position: absolute;
  right: -6px;
  bottom: -6px;
  width: 12px;
  height: 12px;
  border: 1px solid #3259a5;
  border-radius: 9999px;
  background-color: white;
  opacity: 0;
  transition: opacity 0.3s ease;
  cursor: nwse-resize;
  z-index: 2;
}

.youtube-wrapper:hover > .resize-handle {
  opacity: 1;
}
</style>
