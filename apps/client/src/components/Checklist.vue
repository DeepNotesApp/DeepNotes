<template>
  <q-list>
    <PassthroughComponent
      :is="itemsWrapper"
      v-bind="wrapperProps"
      v-on="wrapperEvents ?? {}"
    >
      <slot
        v-if="itemIds.length === 0"
        name="empty"
      ></slot>

      <q-item
        v-for="(itemId, itemIndex) of itemIds"
        :key="itemId"
        clickable
        v-ripple
        :style="{
          'background-color': selectedItemIds.has(itemId) ? '#505050' : '',
        }"
        @click="(event) => selectItem(itemId, event as any)"
        v-bind="props.itemProps?.(itemId, itemIndex)"
      >
        <q-item-section
          avatar
          style="padding-right: 4px"
        >
          <Checkbox
            :model-value="selectedItemIds.has(itemId)"
            style="pointer-events: none; max-height: 100%"
          />
        </q-item-section>

        <slot
          name="item"
          :item-id="itemId"
          :item-index="itemIndex"
        ></slot>
      </q-item>
    </PassthroughComponent>
  </q-list>
</template>

<script setup lang="ts">
import type { QItemProps, QListProps } from 'quasar';
import type { Component } from 'vue';

const emit = defineEmits(['select', 'unselect']);

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Props extends QListProps {
  itemIds: string[];
  selectedItemIds: Set<string>;

  itemProps?: (
    itemId: string,
    itemIndex: number,
  ) => QItemProps & Record<string, unknown>;

  itemsWrapper?: string | Component;
  wrapperProps?: Record<string, unknown>;
  wrapperEvents?: Record<string, unknown>;
}

const props = defineProps<Props>();

let lastSelectedItemId: string;

function selectItem(itemId: string, event: MouseEvent) {
  if (event.shiftKey || internals.mobileAltKey) {
    const sourceItemIndex = props.itemIds.indexOf(lastSelectedItemId);
    const targetItemIndex = props.itemIds.indexOf(itemId);

    if (
      sourceItemIndex >= 0 &&
      targetItemIndex >= 0 &&
      sourceItemIndex !== targetItemIndex
    ) {
      const sign = Math.sign(targetItemIndex - sourceItemIndex);

      const add = !props.selectedItemIds.has(itemId);

      for (let i = sourceItemIndex; i !== targetItemIndex + sign; i += sign) {
        if (add) {
          props.selectedItemIds.add(props.itemIds[i]);
          emit('select', props.itemIds[i]);
        } else {
          props.selectedItemIds.delete(props.itemIds[i]);
          emit('unselect', props.itemIds[i]);
        }
      }
    }
  } else {
    if (props.selectedItemIds.has(itemId)) {
      props.selectedItemIds.delete(itemId);
      emit('unselect', itemId);
    } else {
      props.selectedItemIds.add(itemId);
      emit('select', itemId);
    }
  }

  lastSelectedItemId = itemId;
}
</script>
