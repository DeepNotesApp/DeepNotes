<template>
  <CustomDialog
    ref="dialogRef"
    card-style="width: 240px"
  >
    <template #header>
      <q-card-section style="padding: 12px 20px">
        <div class="text-h6">Accept request</div>
      </q-card-section>
    </template>

    <template #body>
      <q-card-section style="padding: 20px; padding-top: 16px">
        Target role:

        <Gap style="height: 8px" />

        <q-select
          :options="roles()"
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
import { roles, rolesMap } from '@deeplib/misc';
import { acceptJoinRequest } from 'src/code/pages/operations/groups/join-requests/accept';
import { handleError } from 'src/code/utils.client';
import type { Ref } from 'vue';

import type { initialSettings } from '../GroupSettingsDialog.vue';

const props = defineProps<{
  settings: ReturnType<typeof initialSettings>;
}>();

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;

const targetRole = ref<string | null>(null);

async function _acceptJoinRequest() {
  try {
    if (targetRole.value == null) {
      $quasar().notify({
        message: 'Please select a role.',
        color: 'negative',
      });

      return;
    }

    await acceptJoinRequest(props.settings.groupId, {
      patientId: [...props.settings.requests.selectedUserIds][0],
      targetRole: targetRole.value,
    });

    props.settings.requests.selectedUserIds.clear();

    dialogRef.value.onDialogOK();
  } catch (error: any) {
    handleError(error);
  }
}
</script>
