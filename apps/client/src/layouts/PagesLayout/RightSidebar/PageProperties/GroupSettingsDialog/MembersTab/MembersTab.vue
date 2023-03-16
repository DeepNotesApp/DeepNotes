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
        :disable="finalSelectedUserIds.length === 0"
        @click="
          $q.dialog({
            component: ChangeRoleDialog,

            componentProps: {
              settings,
            },
          })
        "
      />

      <Gap style="height: 16px" />

      <DeepBtn
        label="Remove"
        color="negative"
        :disable="finalSelectedUserIds.length === 0"
        @click="removeSelectedUsers()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { rolesMap } from '@deeplib/misc';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names.client';
import { groupNames } from 'src/code/pages/computed/group-names.client';
import type { GroupKeyRotationValues } from 'src/code/pages/group-key-rotation.client';
import { rotateGroupKeys } from 'src/code/pages/group-key-rotation.client';
import { createNotifications } from 'src/code/pages/utils.client';
import type { RealtimeContext } from 'src/code/realtime/context.universal';
import { asyncPrompt, handleError, isCtrlDown } from 'src/code/utils.client';
import type { Ref } from 'vue';

import GroupMemberDetailsDialog from '../GroupMemberDetailsDialog.vue';
import type { initialSettings } from '../GroupSettingsDialog.vue';
import ChangeRoleDialog from './ChangeRoleDialog.vue';

const groupId = inject<string>('groupId')!;

const settings = inject<Ref<ReturnType<typeof initialSettings>>>('settings')!;

const realtimeCtx = inject<RealtimeContext>('realtimeCtx')!;

const membersUserIds = computed(() =>
  Array.from(pagesStore().groups[groupId]?.userIds ?? []).filter(
    (groupMemberId) =>
      realtimeCtx.hget('group-member', `${groupId}:${groupMemberId}`, 'exists'),
  ),
);

const baseSelectedUserIds = computed(
  () => settings.value.members.selectedUserIds,
);
const finalSelectedUserIds = computed(() =>
  membersUserIds.value.filter((userId) =>
    baseSelectedUserIds.value.has(userId),
  ),
);

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

    const agentId = authStore().userId;

    const [groupName, agentName] = await Promise.all([
      groupNames()(groupId).getAsync(),

      groupMemberNames()(`${groupId}:${agentId}`).getAsync(),
    ]);

    await Promise.all(
      finalSelectedUserIds.value.map(async (patientId) => {
        const targetName = await groupMemberNames()(
          `${groupId}:${patientId}`,
        ).getAsync();

        const notificationRecipients = (
          await api().post<{
            notificationRecipients: Record<string, { publicKeyring: string }>;
          }>(`/api/groups/${groupId}/remove-user/${patientId}`, {})
        ).data.notificationRecipients;

        await api().post(`/api/groups/${groupId}/remove-user/${patientId}`, {
          notifications: await createNotifications({
            recipients: notificationRecipients,

            patientId,

            notifications: {
              agent: {
                groupId,

                removed: agentId !== patientId,

                groupName: groupName.text,
                targetName: targetName.text,

                // You left the group.
                // You removed ${targetName} from the group.
              },

              ...(agentId !== patientId
                ? {
                    target: {
                      groupId,

                      removed: true,

                      groupName: groupName.text,

                      // You were removed from the group.
                    },
                  }
                : {}),

              observers: {
                groupId,

                removed: agentId !== patientId,

                groupName: groupName.text,
                agentName: agentName.text,
                ...(agentId !== patientId
                  ? { targetName: targetName.text }
                  : {}),

                // ${agentName} left the group.
                // ${agentName} removed ${targetName} from the group.
              },
            },
          }),
        });
      }),
    );

    const groupKeyRotationValues = (
      await api().post<GroupKeyRotationValues>(
        `/api/groups/${groupId}/rotate-keys`,
        {},
      )
    ).data;

    await api().post(
      `/api/groups/${groupId}/rotate-keys`,
      await rotateGroupKeys(groupId, groupKeyRotationValues),
    );

    baseSelectedUserIds.value.clear();
  } catch (error: any) {
    handleError(error);
  }
}
</script>
