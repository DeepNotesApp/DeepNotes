<template>
  <DeepBtn
    dense
    round
    style="min-height: 50px; min-width: 50px"
    :style="{
      [`border-top-${side}-radius`]: 0,
      [`border-bottom-${side}-radius`]: 0,
    }"
    class="bg-grey-9"
    @click="uiStore()[`toggle${upperFirst(side) as 'Left' | 'Right'}Sidebar`]()"
  >
    <q-icon
      :name="
        uiStore()[`${side}SidebarExpanded`]
          ? `mdi-chevron-${otherSide}`
          : `mdi-chevron-${side}`
      "
      style="position: relative"
      :style="{ [side]: -2 + 'px' }"
    />
  </DeepBtn>
</template>

<script setup lang="ts">
import { upperFirst } from 'lodash';

const props = defineProps<{
  side: 'left' | 'right';
}>();

const otherSide = props.side === 'left' ? 'right' : 'left';
</script>
