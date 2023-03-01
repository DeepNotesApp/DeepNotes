<template>
  <DeepBtn
    v-if="$q.platform.is.mobile"
    color="grey-9"
    style="
      background-color: #808080;

      position: absolute;

      left: 16px;
      bottom: 12px;

      width: 48px;
      height: 48px;

      text-transform: none;
    "
    @pointerdown="onPointerDown"
  >
    Alt

    <q-tooltip
      anchor="top middle"
      self="bottom middle"
      transition-show="jump-up"
      transition-hide="jump-down"
    >
      Alternate function
    </q-tooltip>
  </DeepBtn>
</template>

<script setup lang="ts">
import { listenPointerEvents } from '@stdlib/misc';

const $q = useQuasar();

function onPointerDown(event: PointerEvent) {
  internals.mobileAltKey = true;

  listenPointerEvents(event, {
    up: onPointerUp,
  });
}

function onPointerUp() {
  internals.mobileAltKey = false;
}
</script>
