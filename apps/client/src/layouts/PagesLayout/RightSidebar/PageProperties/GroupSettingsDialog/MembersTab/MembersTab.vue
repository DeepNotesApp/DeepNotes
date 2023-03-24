<template>
  <div style="display: flex">
    <DeepBtn
      label="Select all"
      color="primary"
      :disable="finalSelectedUserIds.length === membersUserIds.length"
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
          v-for="userId in membersUserIds"
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
              {{ groupMemberNames()(`${groupId}:${userId}`).get().text }}
              <span
                v-if="authStore().userId === userId"
                style="color: #c0c0c0"
                >(You)</span
              >
            </q-item-label>

            <q-item-label caption>
              {{
                rolesMap()[
                  realtimeCtx.hget(
                    'group-member',
                    `${groupId}:${userId}`,
                    'role',
                  )
                ]?.name
              }}
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
        label="Change role"
        color="secondary"
        :disable="!canManageSelected"
        @click="
          $q.dialog({
            component: ChangeRoleDialog,

            componentProps: {
              groupId,
              userIds: finalSelectedUserIds,
            },
          })
        "
      />

      <Gap style="height: 16px" />

      <DeepBtn
        label="Remove"
        color="negative"
        :disable="
          finalSelectedUserIds[0] !== authStore().userId && !canManageSelected
        "
        @click="removeSelectedUsers()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { canManageRole, rolesMap } from '@deeplib/misc';
import { rotateGroupKeys } from 'src/code/api-interface/groups/key-rotation';
import { removeGroupUser } from 'src/code/api-interface/groups/remove-user';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names';
import type { RealtimeContext } from 'src/code/realtime/context';
import { asyncPrompt, handleError, isCtrlDown } from 'src/code/utils';

import GroupMemberDetailsDialog from '../GroupMemberDetailsDialog.vue';
import ChangeRoleDialog from './ChangeRoleDialog.vue';

const groupId = inject<string>('groupId')!;

const realtimeCtx = inject<RealtimeContext>('realtimeCtx')!;

const membersUserIds = computed(() => {
  const userIds = Array.from(pagesStore().groups[groupId]?.userIds ?? []);

  const membersUserIds = userIds.filter((groupMemberId) =>
    realtimeCtx.hget('group-member', `${groupId}:${groupMemberId}`, 'exists'),
  );

  membersUserIds.sort((memberAUserId, memberBUserId) => {
    const memberAGroupRole = realtimeCtx.hget(
      'group-member',
      `${groupId}:${memberAUserId}`,
      'role',
    );
    const memberBGroupRole = realtimeCtx.hget(
      'group-member',
      `${groupId}:${memberBUserId}`,
      'role',
    );

    const memberAGroupRoleRank = rolesMap()[memberAGroupRole]?.rank ?? 0;
    const memberBGroupRoleRank = rolesMap()[memberBGroupRole]?.rank ?? 0;

    return memberBGroupRoleRank - memberAGroupRoleRank;
  });

  return membersUserIds;
});

const baseSelectedUserIds = ref(new Set<string>());

const finalSelectedUserIds = computed(() =>
  membersUserIds.value.filter((userId) =>
    baseSelectedUserIds.value.has(userId),
  ),
);

const canManageSelected = computed(() => {
  if (finalSelectedUserIds.value.length === 0) {
    return false;
  }

  const selfGroupRole = realtimeCtx.hget(
    'group-member',
    `${groupId}:${authStore().userId}`,
    'role',
  );

  for (const selectedUserId of finalSelectedUserIds.value) {
    const selectedUserGroupRole = realtimeCtx.hget(
      'group-member',
      `${groupId}:${selectedUserId}`,
      'role',
    );

    if (!canManageRole(selfGroupRole, selectedUserGroupRole)) {
      return false;
    }
  }

  return true;
});

function selectAll() {
  for (const userId of membersUserIds.value) {
    baseSelectedUserIds.value.add(userId);
  }
}
function deselectAll() {
  for (const userId of membersUserIds.value) {
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

async function removeSelectedUsers() {
  try {
    await asyncPrompt({
      title: 'Remove users',
      message: `Are you sure you want to remove ${
        finalSelectedUserIds.value.length
      } user${
        finalSelectedUserIds.value.length === 1 ? '' : 's'
      } from the group?`,

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    await Promise.all(
      finalSelectedUserIds.value.map((patientId) =>
        removeGroupUser(groupId, {
          patientId,
        }),
      ),
    );

    await rotateGroupKeys(groupId);

    baseSelectedUserIds.value.clear();
  } catch (error: any) {
    handleError(error);
  }
}
</script>
