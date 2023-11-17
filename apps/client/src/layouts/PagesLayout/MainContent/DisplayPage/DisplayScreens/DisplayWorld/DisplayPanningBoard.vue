<template>
  <div
    v-if="enabled"
    style="position: absolute; left: 0; top: 0; right: 0; bottom: 0"
    :style="{ cursor: grabbing ? 'grabbing' : 'grab' }"
    @pointerdown.left="onLeftPointerDown"
  ></div>
</template>

<script setup lang="ts">
import { listenPointerEvents, Vec2 } from '@stdlib/misc';
import { useEventListener } from '@vueuse/core';
import type { Page } from 'src/code/pages/page/page';

const page = inject<Page>('page')!;

const enabled = ref(false);

const grabbing = ref(false);

useEventListener('keydown', async (event) => {
  const target = event.target as HTMLElement;

  const isEditingInput =
    target.nodeName === 'INPUT' ||
    target.nodeName === 'TEXTAREA' ||
    target.isContentEditable;

  if (
    !isEditingInput &&
    page.activeElem.react.value?.type !== 'note' &&
    event.code === 'Space' &&
    !enabled.value
  ) {
    enabled.value = true;
  }
});

useEventListener('keyup', async (event) => {
  if (event.code === 'Space') {
    enabled.value = false;
  }
});

let lastClientPos: Vec2;

function onLeftPointerDown(event: PointerEvent) {
  lastClientPos = new Vec2(event.clientX, event.clientY);

  grabbing.value = true;

  listenPointerEvents(event, {
    move: onLeftPointerMove,
    up: onLeftPointerUp,
  });
}

function onLeftPointerMove(event: PointerEvent) {
  const clientPos = new Vec2(event.clientX, event.clientY);

  const delta = page.sizes.screenToWorld2D(clientPos.sub(lastClientPos));

  page.camera.react.pos = page.camera.react.pos.sub(delta);

  lastClientPos = clientPos;
}

function onLeftPointerUp() {
  grabbing.value = false;
}
</script>
