<template>
  <q-select
    ref="combobox"
    :model-value="modelValue"
    @input-value="
      (event: any) => {
        if (event !== modelValue) {
          $emit('update:model-value', event);
        }
      }
    "
    filled
    dense
    use-input
    fill-input
    emit-value
    hide-selected
  >
    <template #option="scope">
      <q-item
        v-bind="scope.itemProps"
        @click="combobox.updateInputValue(scope.opt.value)"
      >
        <slot
          name="item"
          v-bind="scope"
        >
          <q-item-section>{{ scope.opt.label }}</q-item-section>
        </slot>
      </q-item>
    </template>
  </q-select>
</template>

<script setup lang="ts">
import type { QSelectProps } from 'quasar';

interface Props extends QSelectProps {
  modelValue: any;
}

defineProps<Props>();

const combobox = ref();
</script>
