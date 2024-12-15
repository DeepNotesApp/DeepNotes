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
        <Checklist
          :item-ids="invitationsUserIds"
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
import { pluralS } from '@stdlib/misc';
import type { QNotifyUpdateOptions } from 'quasar';
import { cancelJoinInvitation } from 'src/code/api-interface/groups/join-invitations/cancel';
import type { RealtimeContext } from 'src/code/areas/realtime/context';
import { groupInvitationNames } from 'src/code/pages/computed/group-invitation-names';
import { asyncDialog, handleError } from 'src/code/utils/misc';

import GroupMemberDetailsDialog from '../GroupMemberDetailsDialog.vue';
import InviteUserDialog from './InviteUserDialog.vue';

const groupId = inject<string>('groupId')!;

const realtimeCtx = inject<RealtimeContext>('realtimeCtx')!;

const invitationsUserIds = computed(() =>
  Array.from(pagesStore().groups[groupId]?.userIds ?? []).filter(
    (groupMemberId) =>
      realtimeCtx.hget('group', groupId, 'permanent-deletion-date') == null &&
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

async function cancelSelectedInvitations() {
  try {
    await asyncDialog({
      title: 'Cancel invitation',
      message: 'Are you sure you want to cancel this invitation?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    const notif = $quasar().notify({
      group: false,
      timeout: 0,
      message: 'Canceling join invitations...',
    });

    const selectedUserIds = finalSelectedUserIds.value.slice();

    let numSuccess = 0;
    let numFailed = 0;

    for (const [index, userId] of selectedUserIds.entries()) {
      try {
        notif({
          caption: `${index} of ${selectedUserIds.length}`,
        });

        await cancelJoinInvitation({
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
        message: `Join invitation${pluralS(numSuccess)} canceled successfully.`,
        color: 'positive',
      };
    } else {
      notifUpdateOptions = {
        ...notifUpdateOptions,
        message: `${numSuccess > 0 ? numSuccess : 'No'} join invitation${
          numSuccess === 1 ? ' was' : 's were'
        } canceled successfully.<br/>Failed to cancel ${numFailed} join invitations${pluralS(
          numFailed,
        )}.`,
        color: 'negative',
        html: true,
      };
    }

    notif(notifUpdateOptions);
  } catch (error) {
    handleError(error);
  }
}
</script>
