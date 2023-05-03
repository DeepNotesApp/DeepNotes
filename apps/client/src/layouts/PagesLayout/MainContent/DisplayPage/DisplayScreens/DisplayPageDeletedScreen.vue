<template>
  <div>This page has been deleted.</div>

  <Gap style="height: 2px" />

  <div>
    It will be permanently deleted
    <b style="color: red">{{ relativeTimeStr(relativeTime) }}</b
    >.
  </div>

  <template v-if="canRestore">
    <Gap style="height: 13px" />

    <DeepBtn
      label="Restore page"
      color="secondary"
      @click="_restorePage"
    />

    <Gap style="height: 16px" />

    <DeepBtn
      label="Delete permanently"
      color="negative"
      @click="deletePermanently"
    />
  </template>
</template>

<script setup lang="ts">
import { rolesMap } from '@deeplib/misc';
import { relativeTimeStr } from '@stdlib/misc';
import { deletePagePermanently } from 'src/code/api-interface/pages/deletion/delete-permanently';
import { restorePageDeletion } from 'src/code/api-interface/pages/deletion/restore';
import type { Page } from 'src/code/pages/page/page';
import { useRealtimeContext } from 'src/code/realtime/context';
import { asyncDialog, handleError } from 'src/code/utils/misc';

const page = inject<Page>('page')!;

const permanentDate = ref<Date>();

onMounted(async () => {
  permanentDate.value = await internals.realtime.hget(
    'page',
    page.id,
    'permanent-deletion-date',
  );
});

const relativeTime = computed(() => {
  if (permanentDate.value == null) {
    return undefined;
  }

  return permanentDate.value.getTime() - Date.now();
});

const realtimeCtx = useRealtimeContext();

const canRestore = computed(() => {
  const role = realtimeCtx.hget(
    'group-member',
    `${page.react.groupId}:${authStore().userId}`,
    'role',
  );

  return rolesMap()[role]?.permissions.editGroupPages;
});

async function _restorePage() {
  try {
    await restorePageDeletion(page.id);

    $quasar().notify({
      message: 'Page restored successfully.',
      color: 'positive',
    });
  } catch (error: any) {
    handleError(error);
  }
}

async function deletePermanently() {
  try {
    await asyncDialog({
      title: 'Delete page permanently',
      message: 'Are you sure you want to delete this page permanently?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    await deletePagePermanently(page.id);

    $quasar().notify({
      message: 'Page deleted permanently.',
      color: 'positive',
    });
  } catch (error: any) {
    handleError(error);
  }
}
</script>
