<template>
  <template v-if="requestsUserIds.length === 0">
    No group join requests available.
  </template>

  <template v-else>
    <div style="display: flex">
      <DeepBtn
        label="Select all"
        color="primary"
        :disable="finalSelectedUserIds.length === requestsUserIds.length"
        @click="selectAll()"
      />

      <Gap style="width: 16px" />

      <DeepBtn
        label="Clear selection"
        color="primary"
        :disable="finalSelectedUserIds.length === 0"
        @click="deselectAll()"
      />
    </div>

    <Gap style="height: 16px" />

    <div style="flex: 1; height: 0; display: flex">
      <div style="flex: 1">
        <Checklist
          :item-ids="requestsUserIds"
          :selected-item-ids="baseSelectedUserIds"
          @select="(pageId) => baseSelectedUserIds.add(pageId)"
          @unselect="(pageId) => baseSelectedUserIds.delete(pageId)"
          style="
            border-radius: 10px;
            padding: 0;
            overflow-y: auto;
            max-height: 100%;
            background-color: #383838;
          "
        >
          <template #item="{ itemId: userId }">
            <q-item-section>
              <q-item-label>
                {{ groupRequestNames()(`${groupId}:${userId}`).get().text }}
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
          label="Show user details"
          color="primary"
          :disable="finalSelectedUserIds.length !== 1"
          @click="
            $q.dialog({
              component: GroupMemberDetailsDialog,

              componentProps: {
                groupId: groupId,
                userId: finalSelectedUserIds[0],
              },
            })
          "
        />

        <Gap style="height: 16px" />

        <DeepBtn
          label="Accept"
          color="positive"
          :disable="!canManageSelected"
          @click="
            () => {
              $q.dialog({
                component: AcceptRequestDialog,

                componentProps: {
                  groupId,
                  userIds: finalSelectedUserIds,
                },
              });
            }
          "
        />

        <Gap style="height: 16px" />

        <DeepBtn
          label="Reject"
          color="negative"
          :disable="!canManageSelected"
          @click="rejectSelectedRequests()"
        />
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { rolesMap } from '@deeplib/misc';
import { pluralS } from '@stdlib/misc';
import type { QNotifyUpdateOptions } from 'quasar';
import { rejectJoinRequest } from 'src/code/api-interface/groups/join-requests/reject';
import { groupRequestNames } from 'src/code/pages/computed/group-request-names';
import type { RealtimeContext } from 'src/code/realtime/context';
import { asyncDialog, handleError } from 'src/code/utils/misc';

import GroupMemberDetailsDialog from '../GroupMemberDetailsDialog.vue';
import AcceptRequestDialog from './AcceptRequestDialog.vue';

const groupId = inject<string>('groupId')!;

const realtimeCtx = inject<RealtimeContext>('realtimeCtx')!;

const canManageSelected = computed(() => {
  if (finalSelectedUserIds.value.length === 0) {
    return false;
  }

  const selfGroupRole = realtimeCtx.hget(
    'group-member',
    `${groupId}:${authStore().userId}`,
    'role',
  );

  return rolesMap()[selfGroupRole]?.permissions.manageLowerRanks;
});

const requestsUserIds = computed(() =>
  Array.from(pagesStore().groups[groupId]?.userIds ?? []).filter(
    (groupMemberId) =>
      realtimeCtx.hget(
        'group-join-request',
        `${groupId}:${groupMemberId}`,
        'rejected',
      ) === false,
  ),
);

const baseSelectedUserIds = ref(new Set<string>());

const finalSelectedUserIds = computed(() =>
  requestsUserIds.value.filter((userId) =>
    baseSelectedUserIds.value.has(userId),
  ),
);

function selectAll() {
  for (const userId of requestsUserIds.value) {
    baseSelectedUserIds.value.add(userId);
  }
}
function deselectAll() {
  for (const userId of requestsUserIds.value) {
    baseSelectedUserIds.value.delete(userId);
  }
}

async function rejectSelectedRequests() {
  try {
    await asyncDialog({
      title: 'Reject request(s)',
      message: 'Are you sure you want to reject the selected join requests?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    const notif = $quasar().notify({
      group: false,
      timeout: 0,
      message: 'Rejecting join requests...',
    });

    const numTotal = finalSelectedUserIds.value.length;

    let numSuccess = 0;
    let numFailed = 0;

    for (const [index, userId] of finalSelectedUserIds.value.entries()) {
      try {
        notif({
          caption: `${index} of ${numTotal}`,
        });

        await rejectJoinRequest({
          groupId,
          patientId: userId,
        });

        numSuccess++;
      } catch (error) {
        numFailed++;
      }
    }

    baseSelectedUserIds.value.clear();

    let notifUpdateOptions: QNotifyUpdateOptions = {
      timeout: undefined,
      caption: undefined,
    };

    if (numFailed === 0) {
      notifUpdateOptions = {
        ...notifUpdateOptions,
        message: `Join request${pluralS(numSuccess)} rejected successfully.`,
        color: 'positive',
      };
    } else {
      notifUpdateOptions = {
        ...notifUpdateOptions,
        message: `${numSuccess > 0 ? numSuccess : 'No'} join request${
          numSuccess === 1 ? ' was' : 's were'
        } rejected successfully.<br/>Failed to reject ${numFailed} join request${pluralS(
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
</script>
