<template>
  <CustomDialog
    ref="dialogRef"
    card-style="width: 240px"
  >
    <template #header>
      <q-card-section style="padding: 12px 20px">
        <div class="text-h6">Accept join request</div>
      </q-card-section>
    </template>

    <template #body>
      <q-card-section style="padding: 20px; padding-top: 16px">
        Target role:

        <Gap style="height: 8px" />

        <q-select
          :options="manageableRoles"
          option-label="name"
          option-value="id"
          filled
          emit-value
          map-options
          dense
          v-model="targetRole"
        >
          <template #selected>
            <template v-if="targetRole">
              {{ rolesMap()[targetRole].name }}
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
          color="negative"
          @click="dialogRef.onDialogCancel()"
        />
        <DeepBtn
          label="Ok"
          type="submit"
          flat
          color="primary"
          @click.prevent="_acceptJoinRequest()"
        />
      </q-card-actions>
    </template>
  </CustomDialog>
</template>

<script setup lang="ts">
import type { GroupRoleID } from '@deeplib/misc';
import { canManageRole } from '@deeplib/misc';
import { roles, rolesMap } from '@deeplib/misc';
import { acceptJoinRequest } from 'src/code/api-interface/groups/join-requests/accept';
import { useRealtimeContext } from 'src/code/realtime/context';
import { handleError } from 'src/code/utils/misc';
import type { Ref } from 'vue';

const props = defineProps<{
  groupId: string;
  userIds: string[];
}>();

const realtimeCtx = useRealtimeContext();

const manageableRoles = computed(() => {
  const selfGroupRole = realtimeCtx.hget(
    'group-member',
    `${props.groupId}:${authStore().userId}`,
    'role',
  );

  const result = [];

  for (const role of roles()) {
    if (canManageRole(selfGroupRole, role.id)) {
      result.push(role);
    }
  }

  return result;
});

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;

const targetRole = ref<GroupRoleID | null>(null);

async function _acceptJoinRequest() {
  try {
    if (targetRole.value == null) {
      throw new Error('Please select a role.');
    }

    for (const userId of props.userIds) {
      await acceptJoinRequest({
        groupId: props.groupId,
        patientId: userId,
        targetRole: targetRole.value,
      });
    }

    dialogRef.value.onDialogOK();
  } catch (error: any) {
    handleError(error);
  }
}
</script>
