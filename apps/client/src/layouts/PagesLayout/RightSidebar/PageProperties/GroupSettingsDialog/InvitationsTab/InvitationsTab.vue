<template>
  <template v-if="invitationsUserIds.length === 0">
    No group join invitations pending.
  </template>

  <template v-else>
    <div style="display: flex">
      <DeepBtn
        label="Select all"
        color="primary"
        :disable="finalSelectedUserIds.length === invitationsUserIds.length"
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
            v-for="userId in invitationsUserIds"
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
                {{ groupInvitationNames()(`${groupId}:${userId}`).get().text }}
              </q-item-label>
              <q-item-label caption>
                {{
                  rolesMap()[
                    realtimeCtx.hget(
                      'group-join-invitation',
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
          label="Cancel"
          color="negative"
          :disable="finalSelectedUserIds.length === 0"
          @click="cancelSelectedInvitations()"
        />
      </div>
    </div>
  </template>

  <Gap style="height: 16px" />

  <DeepBtn
    label="Invite new member"
    color="primary"
    style="width: 180px"
    :disable="
      !rolesMap()[
        realtimeCtx.hget(
          'group-member',
          `${groupId}:${authStore().userId}`,
          'role',
        )
      ]?.permissions.manageLowerRanks
    "
    @click="
      $q.dialog({
        component: InviteUserDialog,

        componentProps: {
          groupId,
        },
      })
    "
  />
</template>

<script setup lang="ts">
import { rolesMap } from '@deeplib/misc';
import { cancelJoinInvitation } from 'src/code/api-interface/groups/join-invitations/cancel';
import { groupInvitationNames } from 'src/code/pages/computed/group-invitation-names';
import type { RealtimeContext } from 'src/code/realtime/context';
import { asyncPrompt, handleError, isCtrlDown } from 'src/code/utils';

import GroupMemberDetailsDialog from '../GroupMemberDetailsDialog.vue';
import InviteUserDialog from './InviteUserDialog.vue';

const groupId = inject<string>('groupId')!;

const realtimeCtx = inject<RealtimeContext>('realtimeCtx')!;

const invitationsUserIds = computed(() =>
  Array.from(pagesStore().groups[groupId]?.userIds ?? []).filter(
    (groupMemberId) =>
      !!realtimeCtx.hget(
        'group-join-invitation',
        `${groupId}:${groupMemberId}`,
        'exists',
      ),
  ),
);

const baseSelectedUserIds = ref(new Set<string>());

const finalSelectedUserIds = computed(() =>
  invitationsUserIds.value.filter((userId) =>
    baseSelectedUserIds.value.has(userId),
  ),
);

function selectAll() {
  for (const userId of invitationsUserIds.value) {
    baseSelectedUserIds.value.add(userId);
  }
}
function deselectAll() {
  for (const userId of invitationsUserIds.value) {
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

async function cancelSelectedInvitations() {
  try {
    await asyncPrompt({
      title: 'Cancel invitation',
      message: 'Are you sure you want to cancel this invitation?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    for (const userId of finalSelectedUserIds.value) {
      await cancelJoinInvitation(groupId, {
        patientId: userId,
      });
    }

    baseSelectedUserIds.value.clear();
  } catch (error: any) {
    handleError(error);
  }
}
</script>
