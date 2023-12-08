<template>
  <div v-if="requestGroupsIds.length === 0">
    You have no pending group join requests.
  </div>

  <template v-else>
    <div style="display: flex">
      <DeepBtn
        label="Select all"
        color="primary"
        :disable="finalSelectedGroupIds.length === requestGroupsIds.length"
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
          :item-ids="groupIds"
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
          color="primary"
          :disable="activeGroupId == null"
          @click="goToMainPage($event as MouseEvent)"
        />

        <DeepBtn
          label="Cancel"
          color="negative"
          :disable="finalSelectedGroupIds.length === 0"
          @click="cancelSelectedRequests()"
        />
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { pluralS } from '@stdlib/misc';
import type { QNotifyUpdateOptions } from 'quasar';
import { cancelJoinRequest } from 'src/code/api-interface/groups/join-requests/cancel';
import { groupNames } from 'src/code/pages/computed/group-names';
import type { RealtimeContext } from 'src/code/realtime/context';
import { asyncDialog, handleError, isCtrlDown } from 'src/code/utils/misc';
import type { Ref } from 'vue';

const dialog = inject<Ref<InstanceType<typeof CustomDialog>>>('dialog')!;

const groupIds = inject<Ref<string[]>>('groupIds')!;

const realtimeCtx = inject<RealtimeContext>('realtimeCtx')!;

const requestGroupsIds = computed(() =>
  groupIds.value.filter(
    (groupId) =>
      realtimeCtx.hget('group', groupId, 'permanent-deletion-date') == null &&
      realtimeCtx.hget(
        'group-join-request',
        `${groupId}:${authStore().userId}`,
        'rejected',
      ) === false,
  ),
);

const baseSelectedGroupIds = ref(new Set<string>());

const finalSelectedGroupIds = computed(() =>
  requestGroupsIds.value.filter((groupId) =>
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
  for (const groupId of requestGroupsIds.value) {
    baseSelectedGroupIds.value.add(groupId);
  }
}
function deselectAll() {
  for (const groupId of requestGroupsIds.value) {
    baseSelectedGroupIds.value.delete(groupId);
  }
}

async function cancelSelectedRequests() {
  try {
    await asyncDialog({
      title: 'Cancel request(s)',
      message: 'Are you sure you want to cancel the selected join requests?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    const notif = $quasar().notify({
      group: false,
      timeout: 0,
      message: 'Canceling join requests...',
    });

    const selectedGroupIds = finalSelectedGroupIds.value.slice();

    let numSuccess = 0;
    let numFailed = 0;

    for (const [index, groupId] of selectedGroupIds.entries()) {
      try {
        notif({
          caption: `${index} of ${selectedGroupIds.length}`,
        });

        await cancelJoinRequest({
          groupId,
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
        message: `Join request${pluralS(numSuccess)} canceled successfully.`,
        color: 'positive',
      };
    } else {
      notifUpdateOptions = {
        ...notifUpdateOptions,
        message: `${numSuccess > 0 ? numSuccess : 'No'} join request${
          numSuccess === 1 ? ' was' : 's were'
        } canceled successfully.<br/>Failed to cancel ${numFailed} join request${pluralS(
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
