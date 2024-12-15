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
          :options="manageableRoles"
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

          <template #option="scope">
            <q-item
              v-bind="scope.itemProps"
              style="max-width: 220px"
            >
              <q-item-section>
                <q-item-label>{{ scope.opt.name }}</q-item-label>
                <q-item-label caption>{{ scope.opt.description }}</q-item-label>
              </q-item-section>
            </q-item>
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
import type { GroupRoleID } from '@deeplib/misc';
import { canManageRole } from '@deeplib/misc';
import { roles, rolesMap } from '@deeplib/misc';
import { pluralS } from '@stdlib/misc';
import type { QNotifyUpdateOptions } from 'quasar';
import { changeUserRole } from 'src/code/areas/api-interface/groups/change-user-role';
import { useRealtimeContext } from 'src/code/areas/realtime/context';
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

const role = ref<GroupRoleID | null>(null);

async function changeRole() {
  try {
    if (role.value == null) {
      throw new Error('Please select a role.');
    }

    const notif = $quasar().notify({
      group: false,
      timeout: 0,
      message: 'Changing user roles...',
    });

    const selectedUserIds = props.userIds.slice();

    let numSuccess = 0;
    let numFailed = 0;

    for (const [index, userId] of selectedUserIds.entries()) {
      try {
        notif({
          caption: `${index} of ${selectedUserIds.length}`,
        });

        await changeUserRole({
          groupId: props.groupId,
          patientId: userId,
          role: role.value,
        });

        numSuccess++;
      } catch (error) {
        numFailed++;
      }
    }

    let notifUpdateOptions: QNotifyUpdateOptions = {
      timeout: undefined,
      caption: undefined,
    };

    if (numFailed === 0) {
      notifUpdateOptions = {
        ...notifUpdateOptions,
        message: `User role${pluralS(numSuccess)} changed successfully.`,
        color: 'positive',
      };
    } else {
      notifUpdateOptions = {
        ...notifUpdateOptions,
        message: `${numSuccess > 0 ? numSuccess : 'No'} user role${
          numSuccess === 1 ? ' was' : 's were'
        } changed successfully.<br/>Failed to change ${numFailed} user role${pluralS(
          numFailed,
        )}.`,
        color: 'negative',
        html: true,
      };
    }

    notif(notifUpdateOptions);

    dialogRef.value.onDialogOK();
  } catch (error: any) {
    handleError(error);
  }
}
</script>
