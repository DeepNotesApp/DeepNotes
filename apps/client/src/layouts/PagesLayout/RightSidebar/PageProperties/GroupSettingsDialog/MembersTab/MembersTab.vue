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
      <Checklist
        :item-ids="membersUserIds"
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
import { pluralS } from '@stdlib/misc';
import type { QNotifyUpdateOptions } from 'quasar';
import { rotateGroupKeys } from 'src/code/api-interface/groups/key-rotation';
import { removeGroupUser } from 'src/code/api-interface/groups/remove-user';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names';
import type { RealtimeContext } from 'src/code/realtime/context';
import { asyncDialog, handleError } from 'src/code/utils/misc';

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

async function removeSelectedUsers() {
  try {
    await asyncDialog({
      title: 'Remove users',
      message: `Are you sure you want to remove ${
        finalSelectedUserIds.value.length
      } user${pluralS(finalSelectedUserIds.value.length)} from the group?`,

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    const notif = $quasar().notify({
      group: false,
      timeout: 0,
      message: 'Removing users...',
    });

    const numTotal = finalSelectedUserIds.value.length;

    let numSuccess = 0;
    let numFailed = 0;

    for (const [index, userId] of finalSelectedUserIds.value
      .filter((userId) => userId !== authStore().userId)
      .entries()) {
      try {
        notif({
          caption: `${index} of ${numTotal}`,
        });

        await removeGroupUser({
          groupId,
          patientId: userId,
        });

        numSuccess++;
      } catch (error) {
        numFailed++;
      }
    }

    if (canManageSelected.value) {
      await rotateGroupKeys({ groupId });
    }

    if (finalSelectedUserIds.value.includes(authStore().userId)) {
      await removeGroupUser({
        groupId,
        patientId: authStore().userId,
      });

      numSuccess++;
    }

    baseSelectedUserIds.value.clear();

    let notifUpdateOptions: QNotifyUpdateOptions = {
      timeout: undefined,
      caption: undefined,
    };

    if (numFailed === 0) {
      notifUpdateOptions = {
        ...notifUpdateOptions,
        message: `User${pluralS(numSuccess)} removed successfully.`,
        color: 'positive',
      };
    } else {
      notifUpdateOptions = {
        ...notifUpdateOptions,
        message: `${numSuccess > 0 ? numSuccess : 'No'} user${
          numSuccess === 1 ? ' was' : 's were'
        } removed successfully.<br/>Failed to remove ${numFailed} user${pluralS(
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
