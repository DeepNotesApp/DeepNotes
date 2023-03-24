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
        <q-list
          style="
            border-radius: 10px;
            max-height: 100%;
            padding: 0;
            overflow-y: auto;
          "
        >
          <q-item
            v-for="userId in requestsUserIds"
            :key="userId"
            class="text-grey-1"
            style="background-color: #424242"
            clickable
            v-ripple
            active-class="bg-grey-7"
            :active="baseSelectedUserIds.has(userId)"
            @click="select(userId, $event as MouseEvent)"
          >
            <q-item-section>
              <q-item-label>
                {{ groupRequestNames()(`${groupId}:${userId}`).get().text }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
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
import { groupRequestNames } from 'src/code/pages/computed/group-request-names';
import { rejectJoinRequest } from 'src/code/pages/operations/groups/join-requests/reject';
import type { RealtimeContext } from 'src/code/realtime/context';
import { asyncPrompt, handleError, isCtrlDown } from 'src/code/utils';

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

function select(id: string, event: MouseEvent) {
  if (!isCtrlDown(event)) {
    baseSelectedUserIds.value.clear();
  }

  if (baseSelectedUserIds.value.has(id)) {
    baseSelectedUserIds.value.delete(id);
  } else {
    baseSelectedUserIds.value.add(id);
  }
}

async function rejectSelectedRequests() {
  try {
    await asyncPrompt({
      title: 'Reject request(s)',
      message: 'Are you sure you want to reject the selected join requests?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    await Promise.all(
      finalSelectedUserIds.value.map((patientId) =>
        rejectJoinRequest(groupId, {
          patientId,
        }),
      ),
    );

    baseSelectedUserIds.value.clear();
  } catch (error: any) {
    handleError(error);
  }
}
</script>
