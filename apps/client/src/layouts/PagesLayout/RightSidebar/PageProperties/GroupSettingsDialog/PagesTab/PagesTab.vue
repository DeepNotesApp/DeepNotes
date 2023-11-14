<template>
  <div style="display: flex">
    <DeepBtn
      label="Select all"
      color="primary"
      :disable="finalSelectedPageIds.length === finalPageIds.length"
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
      <Checklist
        :item-ids="finalPageIds"
        :items-wrapper="CustomInfiniteScroll"
        :wrapper-events="{ load: onLoad }"
        :wrapper-props="{ disable: !hasMorePages }"
        :selected-item-ids="baseSelectedPageIds"
        @select="(pageId) => baseSelectedPageIds.add(pageId)"
        @unselect="(pageId) => baseSelectedPageIds.delete(pageId)"
        style="max-height: 100%; border-radius: 10px; background-color: #383838"
        class="overflow-auto"
      >
        <template #item="{ itemId: groupPageId }">
          <q-item-section>
            <q-item-label>
              {{ getPageTitle(groupPageId, { prefer: 'absolute' }).text }}
            </q-item-label>
          </q-item-section>
        </template>
      </Checklist>
    </div>

    <Gap style="width: 16px" />

    <div
      style="flex: none; width: 200px; display: flex; flex-direction: column"
    >
      <DeepBtn
        label="Go to page"
        color="primary"
        :disable="finalSelectedPageIds.length !== 1"
        @click="goToPage(finalSelectedPageIds[0])"
      />

      <Gap style="height: 16px" />

      <DeepBtn
        label="Move"
        color="primary"
        :disable="
          finalSelectedPageIds.length === 0 ||
          !rolesMap()[
            realtimeCtx.hget(
              'group-member',
              `${groupId}:${authStore().userId}`,
              'role',
            )
          ]?.permissions.editGroupSettings
        "
        @click="movePages"
      />

      <Gap style="height: 16px" />

      <DeepBtn
        label="Delete"
        color="negative"
        :disable="
          finalSelectedPageIds.length === 0 ||
          !rolesMap()[
            realtimeCtx.hget(
              'group-member',
              `${groupId}:${authStore().userId}`,
              'role',
            )
          ]?.permissions.editGroupPages
        "
        @click="deletePages"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { rolesMap } from '@deeplib/misc';
import { deletePage } from 'src/code/api-interface/pages/deletion/delete';
import { movePage } from 'src/code/api-interface/pages/move';
import { getPageTitle } from 'src/code/pages/utils';
import type { RealtimeContext } from 'src/code/realtime/context';
import { asyncDialog, handleError } from 'src/code/utils/misc';
import CustomInfiniteScroll from 'src/components/CustomInfiniteScroll.vue';
import type { Ref } from 'vue';

import MovePageDialog from '../../MovePageDialog.vue';

const dialog = inject<Ref<InstanceType<typeof CustomDialog>>>('dialog')!;

const groupId = inject<string>('groupId')!;

const realtimeCtx = inject<RealtimeContext>('realtimeCtx')!;

const basePageIds = inject<Ref<string[]>>('pageIds')!;
const finalPageIds = computed(() =>
  basePageIds.value.filter(
    (pageId) =>
      realtimeCtx.hget('page', pageId, 'group-id') === groupId &&
      realtimeCtx.hget('page', pageId, 'permanent-deletion-date') == null,
  ),
);

const hasMorePages = inject<Ref<boolean>>('hasMorePages')!;

const baseSelectedPageIds = ref(new Set<string>());
const finalSelectedPageIds = computed(() =>
  finalPageIds.value.filter((pageId) => baseSelectedPageIds.value.has(pageId)),
);

function selectAll() {
  for (const pageId of finalPageIds.value) {
    baseSelectedPageIds.value.add(pageId);
  }
}
function deselectAll() {
  for (const pageId of finalPageIds.value) {
    baseSelectedPageIds.value.delete(pageId);
  }
}

async function onLoad(index: number, done: (stop?: boolean) => void) {
  try {
    const response = await trpcClient.groups.getPages.query({
      groupId,

      lastPageId: basePageIds.value.at(-1),
    });

    basePageIds.value.push(...response.pageIds);
    hasMorePages.value = response.hasMore;
  } catch (error) {
    handleError(error);

    hasMorePages.value = false;
  }

  done(!hasMorePages.value);
}

async function goToPage(pageId: string) {
  await internals.pages.goToPage(pageId);

  dialog.value.onDialogOK();
}

async function movePages() {
  try {
    const movePageParams: Parameters<typeof movePage>[0] = await asyncDialog({
      component: MovePageDialog,

      componentProps: {
        groupId,
      },
    });

    for (const pageId of finalSelectedPageIds.value) {
      await movePage({
        ...movePageParams,

        pageId,
      });
    }

    $quasar().notify({
      message: 'Pages moved successfully.',
      color: 'positive',
    });
  } catch (error) {
    handleError(error);
  }
}

async function deletePages() {
  try {
    await asyncDialog({
      title: 'Delete pages',
      message: 'Are you sure you want to delete these pages?',

      focus: 'cancel',
      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    for (const pageId of finalSelectedPageIds.value) {
      await deletePage(pageId);
    }

    $quasar().notify({
      message: 'Pages deleted successfully.',
      color: 'positive',
    });
  } catch (error) {
    handleError(error);
  }
}
</script>
