<template>
  <div style="display: flex">
    <DeepBtn
      label="Select all"
      color="primary"
      :disable="finalSelectedPageIds.length === groupPageIds.length"
      @click="selectAll()"
    />

    <Gap style="width: 16px" />

    <DeepBtn
      label="Clear selection"
      color="primary"
      :disable="finalSelectedPageIds.length === 0"
      @click="deselectAll()"
    />
  </div>

  <Gap style="height: 16px" />

  <div style="flex: 1; height: 0; display: flex">
    <div style="flex: 1">
      <q-list
        style="
          border-radius: 10px;
          max-height: 100%;
          padding: 0;
          overflow-y: auto;
        "
      >
        <q-item
          v-for="groupPageId in groupPageIds"
          :key="groupPageId"
          class="text-grey-1"
          style="background-color: #424242"
          clickable
          v-ripple
          active-class="bg-grey-7"
          :active="baseSelectedPageIds.has(groupPageId)"
          @click="select(groupPageId, $event as MouseEvent)"
        >
          <q-item-section>
            <q-item-label>
              {{ pageAbsoluteTitles()(groupPageId).get().text }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <Gap style="width: 16px" />

    <div
      style="flex: none; width: 200px; display: flex; flex-direction: column"
    >
      <!-- -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { pageAbsoluteTitles } from 'src/code/pages/computed/page-absolute-titles.client';
import type { Ref } from 'vue';

import type { initialSettings } from '../GroupSettingsDialog.vue';

const groupId = inject<string>('groupId')!;

const settings = inject<Ref<ReturnType<typeof initialSettings>>>('settings')!;

const groupPageIds = ref<string[]>([]);

onMounted(async () => {
  groupPageIds.value = await api().post(
    `/api/groups/${groupId}/load-pages`,
    {},
  );
});

const baseSelectedPageIds = computed(
  () => settings.value.pages.selectedPageIds,
);
const finalSelectedPageIds = computed(() =>
  groupPageIds.value.filter((pageId) => baseSelectedPageIds.value.has(pageId)),
);

function selectAll() {
  for (const pageId of groupPageIds.value) {
    baseSelectedPageIds.value.add(pageId);
  }
}
function deselectAll() {
  for (const pageId of groupPageIds.value) {
    baseSelectedPageIds.value.delete(pageId);
  }
}

function select(id: string, event: MouseEvent) {
  if (!event.ctrlKey) {
    baseSelectedPageIds.value.clear();
  }

  if (baseSelectedPageIds.value.has(id)) {
    baseSelectedPageIds.value.delete(id);
  } else {
    baseSelectedPageIds.value.add(id);
  }
}
</script>
