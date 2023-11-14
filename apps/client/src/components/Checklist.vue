<template>
  <q-list>
    <slot
      v-if="itemIds.length === 0"
      name="empty"
    ></slot>

    <q-item
      v-for="(itemId, itemIndex) of itemIds"
      :key="itemId"
      clickable
      @click.capture="(event) => selectItem(itemId, event as any)"
      v-bind="props.itemProps"
    >
      <q-item-section
        avatar
        style="padding-right: 4px"
      >
        <Checkbox :model-value="finalSelectedItemIds.includes(itemId)" />
      </q-item-section>

      <slot
        name="item"
        :item-id="itemId"
        :item-index="itemIndex"
      ></slot>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import type { QItemProps, QListProps } from 'quasar';

const emit = defineEmits(['select', 'unselect']);

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Props extends QListProps {
  itemIds: string[];

  itemProps?: QItemProps;
}

const props = defineProps<Props>();

let lastSelectedItemId: string;

const baseSelectedItemIds = ref(new Set<string>());

const finalSelectedItemIds = computed(() =>
  props.itemIds.filter((itemId) => baseSelectedItemIds.value.has(itemId)),
);

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

      const add = !baseSelectedItemIds.value.has(itemId);

      for (let i = sourceItemIndex; i !== targetItemIndex + sign; i += sign) {
        if (add) {
          baseSelectedItemIds.value.add(props.itemIds[i]);
          emit('select', props.itemIds[i]);
        } else {
          baseSelectedItemIds.value.delete(props.itemIds[i]);
          emit('unselect', props.itemIds[i]);
        }
      }
    }
  } else {
    if (baseSelectedItemIds.value.has(itemId)) {
      baseSelectedItemIds.value.delete(itemId);
      emit('unselect', itemId);
    } else {
      baseSelectedItemIds.value.add(itemId);
      emit('select', itemId);
    }
  }

  lastSelectedItemId = itemId;
}
</script>
