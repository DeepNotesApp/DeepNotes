<template>
  <div v-if="invitationGroupsIds.length === 0">
    You have no pending group join invitations.
  </div>

  <template v-else>
    <div style="display: flex">
      <DeepBtn
        label="Select all"
        color="primary"
        :disable="finalSelectedGroupIds.length === invitationGroupsIds.length"
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
          <q-item
            v-for="groupId in invitationGroupsIds"
            :key="groupId"
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
                      'group-join-invitation',
                      `${groupId}:${authStore().userId}`,
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
          label="Go to main page"
          color="primary"
          :disable="activeGroupId == null"
          @click="goToMainPage($event as MouseEvent)"
        />

        <Gap style="height: 12px" />

        <DeepBtn
          label="Accept"
          color="positive"
          :disable="finalSelectedGroupIds.length === 0"
          @click="acceptSelectedInvitations()"
        />

        <Gap style="height: 12px" />

        <DeepBtn
          label="Reject"
          color="negative"
          :disable="finalSelectedGroupIds.length === 0"
          @click="rejectSelectedInvitations()"
        />
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { rolesMap } from '@deeplib/misc';
import { groupNames } from 'src/code/pages/computed/group-names.client';
import {
  acceptJoinInvitation,
  rejectJoinInvitation,
} from 'src/code/pages/groups.client';
import type { RealtimeContext } from 'src/code/realtime/context.universal';
import { asyncPrompt, handleError } from 'src/code/utils.client';
import type { Ref } from 'vue';

import AcceptInvitationDialog from '../MainContent/DisplayPage/DisplayScreens/AcceptInvitationDialog.vue';
import type { initialSettings } from './UserSettingsDialog.vue';

const dialog = inject<Ref<InstanceType<typeof CustomDialog>>>('dialog')!;

const settings = inject<Ref<ReturnType<typeof initialSettings>>>('settings')!;

const realtimeCtx = inject<RealtimeContext>('realtimeCtx')!;

const invitationGroupsIds = computed(() =>
  settings.value.groupIds.filter(
    (groupId) =>
      !!realtimeCtx.hget(
        'group-join-invitation',
        `${groupId}:${authStore().userId}`,
        'exists',
      ),
  ),
);

const baseSelectedGroupIds = computed(
  () => settings.value.invitations.selectedGroupIds,
);
const finalSelectedGroupIds = computed(() =>
  invitationGroupsIds.value.filter((groupId) =>
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
  for (const groupId of invitationGroupsIds.value) {
    baseSelectedGroupIds.value.add(groupId);
  }
}
function deselectAll() {
  for (const groupId of invitationGroupsIds.value) {
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

async function acceptSelectedInvitations() {
  $quasar()
    .dialog({ component: AcceptInvitationDialog })
    .onOk(async (userName) => {
      try {
        await Promise.all(
          finalSelectedGroupIds.value.map((groupId) =>
            acceptJoinInvitation(groupId, userName),
          ),
        );

        baseSelectedGroupIds.value.clear();
      } catch (error: any) {
        handleError(error);
      }
    });
}
async function rejectSelectedInvitations() {
  try {
    await asyncPrompt({
      title: 'Reject invitation(s)',
      message: 'Are you sure you want to reject the selected join invitations?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    await Promise.all(
      finalSelectedGroupIds.value.map((groupId) =>
        rejectJoinInvitation(groupId),
      ),
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
