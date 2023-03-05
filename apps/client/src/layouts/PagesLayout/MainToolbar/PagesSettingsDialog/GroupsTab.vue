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
      <q-list
        style="
          border-radius: 10px;
          padding: 0;
          overflow-y: auto;
          max-height: 100%;
        "
      >
        <template
          v-for="groupId in memberGroupsIds"
          :key="groupId"
        >
          <q-item
            v-if="
              realtimeCtx.hget('group', groupId, 'permanent-deletion-date') ==
              null
            "
            class="text-grey-1"
            style="background-color: #424242"
            clickable
            v-ripple
            active-class="bg-grey-7"
            :active="baseSelectedGroupIds.has(groupId)"
            @click="select(groupId, $event as MouseEvent)"
          >
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
          </q-item>
        </template>
      </q-list>
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
import { groupMemberNames } from 'src/code/pages/computed/group-member-names.client';
import { groupNames } from 'src/code/pages/computed/group-names.client';
import type { GroupKeyRotationValues } from 'src/code/pages/group-key-rotation.client';
import { rotateGroupKeys } from 'src/code/pages/group-key-rotation.client';
import { createNotifications } from 'src/code/pages/utils.client';
import type { RealtimeContext } from 'src/code/realtime/context.universal';
import { asyncPrompt, handleError } from 'src/code/utils.client';
import type { Ref } from 'vue';

import type { initialSettings } from './PagesSettingsDialog.vue';

const dialog = inject<Ref<InstanceType<typeof CustomDialog>>>('dialog')!;

const settings = inject<Ref<ReturnType<typeof initialSettings>>>('settings')!;

const realtimeCtx = inject<RealtimeContext>('realtimeCtx')!;

const memberGroupsIds = computed(() =>
  settings.value.groupIds.filter((groupId) =>
    realtimeCtx.hget(
      'group-member',
      `${groupId}:${authStore().userId}`,
      'exists',
    ),
  ),
);

const baseSelectedGroupIds = computed(
  () => settings.value.groups.selectedGroupIds,
);
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

function select(groupId: string, event: MouseEvent) {
  if (!event.ctrlKey) {
    baseSelectedGroupIds.value.clear();
  }

  if (baseSelectedGroupIds.value.has(groupId)) {
    baseSelectedGroupIds.value.delete(groupId);
  } else {
    baseSelectedGroupIds.value.add(groupId);
  }
}

async function leaveSelectedGroups() {
  try {
    await asyncPrompt({
      title: 'Leave group(s)',
      message: 'Are you sure you want to leave the selected groups?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    const agentId = authStore().userId;

    await Promise.all(
      finalSelectedGroupIds.value.map(async (groupId) => {
        const [groupName, agentName] = await Promise.all([
          groupNames()(groupId).getAsync(),

          groupMemberNames()(`${groupId}:${agentId}`).getAsync(),
        ]);

        const response = (
          await api().post<
            GroupKeyRotationValues & {
              notificationRecipients: Record<string, { publicKeyring: string }>;
            }
          >(`/api/groups/${groupId}/remove-user/${agentId}`, {
            rotateGroupKeys: true,
          })
        ).data;

        await api().post(`/api/groups/${groupId}/remove-user/${agentId}`, {
          rotateGroupKeys: true,

          ...(await rotateGroupKeys(groupId, response)),

          notifications: await createNotifications({
            recipients: response.notificationRecipients,

            notifications: {
              agent: {
                groupId,

                removed: false,

                groupName: groupName.text,
                agentName: agentName.text,

                // You left the group.
              },

              observers: {
                groupId,

                removed: false,

                groupName: groupName.text,
                agentName: agentName.text,

                // ${agentName} left the group.
              },
            },
          }),
        });
      }),
    );

    baseSelectedGroupIds.value.clear();
  } catch (error: any) {
    handleError(error);
  }
}

async function goToMainPage(event: MouseEvent) {
  await internals.pages.goToGroup(activeGroupId.value!, {
    openInNewTab: event.ctrlKey,
  });

  dialog.value.onDialogOK();
}
</script>
