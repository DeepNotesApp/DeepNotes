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
import { rejectJoinInvitation } from 'src/code/api-interface/groups/join-invitations/reject';
import { groupNames } from 'src/code/pages/computed/group-names';
import type { RealtimeContext } from 'src/code/realtime/context';
import { asyncPrompt, handleError, isCtrlDown } from 'src/code/utils/misc';
import type { Ref } from 'vue';

import AcceptInvitationDialog from '../../MainContent/DisplayPage/DisplayScreens/AcceptInvitationDialog.vue';

const dialog = inject<Ref<InstanceType<typeof CustomDialog>>>('dialog')!;

const groupIds = inject<Ref<string[]>>('groupIds')!;

const realtimeCtx = inject<RealtimeContext>('realtimeCtx')!;

const invitationGroupsIds = computed(() =>
  groupIds.value.filter(
    (groupId) =>
      !!realtimeCtx.hget(
        'group-join-invitation',
        `${groupId}:${authStore().userId}`,
        'exists',
      ),
  ),
);

const baseSelectedGroupIds = ref(new Set<string>());

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
  if (!isCtrlDown(event)) {
    baseSelectedGroupIds.value.clear();
  }

  if (baseSelectedGroupIds.value.has(groupId)) {
    baseSelectedGroupIds.value.delete(groupId);
  } else {
    baseSelectedGroupIds.value.add(groupId);
  }
}

async function acceptSelectedInvitations() {
  $quasar().dialog({
    component: AcceptInvitationDialog,

    componentProps: {
      groupIds: groupIds.value,
    },
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

    for (const groupId of finalSelectedGroupIds.value) {
      await rejectJoinInvitation(groupId);
    }

    baseSelectedGroupIds.value.clear();
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
