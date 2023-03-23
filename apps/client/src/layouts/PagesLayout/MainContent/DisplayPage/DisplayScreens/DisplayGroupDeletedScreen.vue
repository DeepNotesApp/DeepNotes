<template>
  <div>This group has been deleted.</div>

  <Gap style="height: 2px" />

  <div>
    It will be permanently deleted
    <b style="color: red">{{ relativeTimeStr(relativeTime) }}</b
    >.
  </div>

  <template v-if="canRestore">
    <Gap style="height: 13px" />

    <DeepBtn
      label="Restore group"
      color="secondary"
      @click="_restoreGroup"
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
import { deleteGroupPermanently } from 'src/code/pages/operations/groups/deletion/delete-permanently';
import { restoreGroup } from 'src/code/pages/operations/groups/deletion/restore';
import type { Page } from 'src/code/pages/page/page';
import { useRealtimeContext } from 'src/code/realtime/context';
import { asyncPrompt, handleError } from 'src/code/utils';

const page = inject<Page>('page')!;

const permanentDate = ref<Date>();

onMounted(async () => {
  permanentDate.value = await internals.realtime.hget(
    'group',
    page.react.groupId,
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

  return rolesMap()[role]?.permissions.editGroupSettings;
});

async function _restoreGroup() {
  try {
    await restoreGroup(page.react.groupId);

    $quasar().notify({
      message: 'Group restored successfully.',
      color: 'positive',
    });
  } catch (error: any) {
    handleError(error);
  }
}

async function deletePermanently() {
  try {
    await asyncPrompt({
      title: 'Delete group permanently',
      message: 'Are you sure you want to delete this group permanently?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    await deleteGroupPermanently(page.react.groupId);

    $quasar().notify({
      message: 'Group deleted permanently.',
      color: 'positive',
    });
  } catch (error: any) {
    handleError(error);
  }
}
</script>
