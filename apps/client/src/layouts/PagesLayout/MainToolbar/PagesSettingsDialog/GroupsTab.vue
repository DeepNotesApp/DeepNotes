<template>
  These are the groups you participate in:

  <Gap style="height: 16px" />

  <div style="display: flex">
    <DeepBtn
      label="Select all"
      color="primary"
      :disable="finalSelectedGroupIds.length === memberGroupsIds.length"
      @click="selectAll()"
    />

    <Gap style="width: 16px" />

    <DeepBtn
      label="Clear selection"
      color="primary"
      :disable="finalSelectedGroupIds.length === 0"
      @click="deselectAll()"
    />
  </div>

  <Gap style="height: 16px" />

  <div style="flex: 1; height: 0; display: flex">
    <div style="flex: 1">
      <Checklist
        :item-ids="memberGroupsIds"
        :selected-item-ids="baseSelectedGroupIds"
        @select="(pageId) => baseSelectedGroupIds.add(pageId)"
        @unselect="(pageId) => baseSelectedGroupIds.delete(pageId)"
        style="
          border-radius: 10px;
          padding: 0;
          overflow-y: auto;
          max-height: 100%;
          background-color: #383838;
        "
      >
        <template #item="{ itemId: groupId }">
          <q-item-section>
            <q-item-label>
              {{ groupNames()(groupId).get().text }}
            </q-item-label>
            <q-item-label caption>
              {{
                rolesMap()[
                  realtimeCtx.hget(
                    'group-member',
                    `${groupId}:${authStore().userId}`,
                    'role',
                  )!
                ]?.name
              }}
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
        label="Go to main page"
        color="secondary"
        :disable="activeGroupId == null"
        @click="goToMainPage($event as MouseEvent)"
      />

      <Gap style="height: 16px" />

      <DeepBtn
        label="Leave"
        color="negative"
        :disable="finalSelectedGroupIds.length === 0"
        @click="leaveSelectedGroups()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { rolesMap } from '@deeplib/misc';
import { pluralS } from '@stdlib/misc';
import type { QNotifyUpdateOptions } from 'quasar';
import { removeGroupUser } from 'src/code/api-interface/groups/remove-user';
import { groupNames } from 'src/code/pages/computed/group-names';
import type { RealtimeContext } from 'src/code/realtime/context';
import { asyncDialog, handleError, isCtrlDown } from 'src/code/utils/misc';
import type { Ref } from 'vue';

const dialog = inject<Ref<InstanceType<typeof CustomDialog>>>('dialog')!;

const groupIds = inject<Ref<string[]>>('groupIds')!;

const realtimeCtx = inject<RealtimeContext>('realtimeCtx')!;

const memberGroupsIds = computed(() =>
  groupIds.value.filter(
    (groupId) =>
      realtimeCtx.hget('group', groupId, 'permanent-deletion-date') == null &&
      realtimeCtx.hget(
        'group-member',
        `${groupId}:${authStore().userId}`,
        'exists',
      ),
  ),
);

const baseSelectedGroupIds = ref(new Set<string>());

const finalSelectedGroupIds = computed(() =>
  memberGroupsIds.value.filter((groupId) =>
    baseSelectedGroupIds.value.has(groupId),
  ),
);

const activeGroupId = computed(() => {
  if (finalSelectedGroupIds.value.length !== 1) {
    return null;
  }

  return finalSelectedGroupIds.value[0];
});

function selectAll() {
  for (const groupId of memberGroupsIds.value) {
    baseSelectedGroupIds.value.add(groupId);
  }
}
function deselectAll() {
  for (const groupId of memberGroupsIds.value) {
    baseSelectedGroupIds.value.delete(groupId);
  }
}

async function leaveSelectedGroups() {
  try {
    await asyncDialog({
      title: 'Leave group(s)',
      message: 'Are you sure you want to leave the selected groups?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    const notif = $quasar().notify({
      group: false,
      timeout: 0,
      message: 'Leaving groups...',
    });

    const numTotal = finalSelectedGroupIds.value.length;

    let numSuccess = 0;
    let numFailed = 0;

    for (const [index, groupId] of finalSelectedGroupIds.value.entries()) {
      try {
        notif({
          caption: `${index} of ${numTotal}`,
        });

        await removeGroupUser({
          groupId,
          patientId: authStore().userId,
        });

        numSuccess++;
      } catch (error) {
        numFailed++;
      }
    }

    baseSelectedGroupIds.value.clear();

    let notifUpdateOptions: QNotifyUpdateOptions = {
      timeout: undefined,
      caption: undefined,
    };

    if (numFailed === 0) {
      notifUpdateOptions = {
        ...notifUpdateOptions,
        message: `Group${pluralS(numSuccess)} left successfully.`,
        color: 'positive',
      };
    } else {
      notifUpdateOptions = {
        ...notifUpdateOptions,
        message: `${numSuccess > 0 ? numSuccess : 'No'} group${
          numSuccess === 1 ? ' was' : 's were'
        } left successfully.<br/>Failed to leave ${numFailed} group${pluralS(
          numFailed,
        )}.`,
        color: 'negative',
        html: true,
      };
    }

    notif(notifUpdateOptions);
  } catch (error: any) {
    handleError(error);
  }
}

async function goToMainPage(event: MouseEvent) {
  await internals.pages.goToGroup(activeGroupId.value!, {
    openInNewTab: isCtrlDown(event),
  });

  dialog.value.onDialogOK();
}
</script>
