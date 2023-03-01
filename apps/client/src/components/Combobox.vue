<template>
  <q-select
    ref="combobox"
    :label="label"
    :options="options"
    :model-value="modelValue"
    @input-value="
      (event: any) => {
        if (event !== modelValue) {
          $emit('update:model-value', event);
        }
      }
    "
    :disable="disable"
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
defineProps<{
  label: string;
  options: any;
  modelValue: any;
  disable?: boolean;
}>();

const combobox = ref();
</script>
