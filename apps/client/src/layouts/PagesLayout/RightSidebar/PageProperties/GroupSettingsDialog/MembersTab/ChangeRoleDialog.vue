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
import type { GroupRoleID } from '@deeplib/misc';
import { roles, rolesMap } from '@deeplib/misc';
import { changeUserRole } from 'src/code/pages/operations/groups/change-user-role';
import { handleError } from 'src/code/utils.client';
import type { Ref } from 'vue';

import type { initialSettings } from '../GroupSettingsDialog.vue';

const props = defineProps<{
  settings: ReturnType<typeof initialSettings>;
}>();

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;

const role = ref<GroupRoleID | null>(null);

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
    await Promise.all(
      Array.from(selectedIds.value).map((patientId) =>
        changeUserRole(props.settings.groupId, {
          patientId,
          role: role.value!,
        }),
      ),
    );

    dialogRef.value.onDialogOK();
  } catch (error: any) {
    handleError(error);
  }
}
</script>
