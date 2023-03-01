<template>
  <CustomDialog
    ref="dialogRef"
    card-style="width: 260px"
  >
    <template #header>
      <q-card-section style="padding: 12px 20px">
        <div class="text-h6">Change user role</div>
      </q-card-section>
    </template>

    <template #body>
      <q-card-section style="padding: 20px">
        <q-select
          :options="roles()"
          option-label="name"
          option-value="id"
          filled
          emit-value
          map-options
          dense
          v-model="role"
        >
          <template #selected>
            <template v-if="role">
              {{ rolesMap()[role].name }}
            </template>
            <template v-else>(Select a role)</template>
          </template>
        </q-select>
      </q-card-section>
    </template>

    <template #footer>
      <q-card-actions align="right">
        <DeepBtn
          flat
          label="Cancel"
          color="primary"
          @click="dialogRef.onDialogCancel()"
        />
        <DeepBtn
          label="Ok"
          type="submit"
          flat
          color="primary"
          @click.prevent="changeRole()"
        />
      </q-card-actions>
    </template>
  </CustomDialog>
</template>

<script setup lang="ts">
import { roles, rolesMap } from '@deeplib/misc';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names.client';
import { groupNames } from 'src/code/pages/computed/group-names.client';
import { requestWithNotifications } from 'src/code/pages/utils.client';
import { handleError } from 'src/code/utils.client';
import type { Ref } from 'vue';

import type { initialSettings } from '../GroupSettingsDialog.vue';

const props = defineProps<{
  settings: ReturnType<typeof initialSettings>;
}>();

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;

const role = ref<string | null>(null);

const selectedIds = computed(() => props.settings.members.selectedUserIds);

async function changeRole() {
  if (role.value == null) {
    $quasar().notify({
      message: 'Please select a role.',
      type: 'negative',
    });
    return;
  }

  try {
    const agentId = authStore().userId;
    const roleName = rolesMap()[role.value!].name;

    const [groupName, agentName] = await Promise.all([
      groupNames()(props.settings.groupId).getAsync(),

      groupMemberNames()(`${props.settings.groupId}:${agentId}`).getAsync(),
    ]);

    await Promise.all(
      Array.from(selectedIds.value).map(async (patientId) => {
        const targetName = await groupMemberNames()(
          `${props.settings.groupId}:${patientId}`,
        ).getAsync();

        await requestWithNotifications({
          url: `/api/groups/${props.settings.groupId}/change-user-role`,

          body: {
            patientId,
            requestedRole: role.value,
          },

          patientId,

          notifications: {
            agent: {
              groupId: props.settings.groupId,

              groupName: groupName.text,
              targetName: targetName.text,
              roleName,

              // You changed the role of ${targetName} to ${roleName}.
            },

            target: {
              groupId: props.settings.groupId,

              groupName: groupName.text,
              roleName,

              // Your role was changed to ${roleName}.
            },

            observers: {
              groupId: props.settings.groupId,

              groupName: groupName.text,
              agentName: agentName.text,
              targetName: targetName.text,
              roleName,

              // ${agentName} changed the role of ${targetName} to ${roleName}.
            },
          },
        });
      }),
    );

    dialogRef.value.onDialogOK();
  } catch (error: any) {
    handleError(error);
  }
}
</script>
