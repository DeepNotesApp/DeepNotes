<template>
  <q-menu
    ref="menu"
    :model-value="true"
    :anchor="
      (basis === 'left' ? `center ${flippedPos}` : `${pos} middle`) as any
    "
    :self="(basis === 'left' ? `center ${pos}` : `${flippedPos} middle`) as any"
    :offset="[basis === 'left' ? 8 : 0, basis === 'top' ? 8 : 0]"
    style="position: relative; overflow: visible"
    persistent
    no-focus
    no-refocus
  >
    <div
      style="
        padding: 8px;
        background-color: #5e00d6;
        border-radius: 4px;
        overflow: hidden;
        white-space: nowrap;
      "
    >
      <slot></slot>

      <Gap style="height: 8px" />

      <div style="display: flex">
        <a
          v-if="internals.pages.react.tutorialStep > 1"
          href="javascript:undefined"
          style="color: aqua; font-size: 12px"
          @click="
            internals.pages.react.tutorialStep = Math.max(
              1,
              internals.pages.react.tutorialStep - 1,
            )
          "
        >
          Previous
        </a>

        <Gap style="flex: 1" />

        <a
          href="javascript:undefined"
          style="color: aqua; font-size: 12px"
          @click="internals.pages.react.tutorialStep++"
        >
          Next
        </a>
      </div>
    </div>

    <Indicator
      :pos="flippedPos"
      color="#5e00d6"
    />
  </q-menu>
</template>

<script setup lang="ts">
import { QMenu } from 'quasar';
import type { CSSPosition } from 'src/code/utils/position';
import { flipPos, posToBasis } from 'src/code/utils/position';

const props = defineProps<{
  pos: CSSPosition;
}>();

const basis = computed(() => posToBasis(props.pos));
const flippedPos = computed(() => flipPos(props.pos));

const menu = ref<QMenu>();

defineExpose({
  updatePosition() {
    menu.value?.updatePosition();
  },
});
</script>
