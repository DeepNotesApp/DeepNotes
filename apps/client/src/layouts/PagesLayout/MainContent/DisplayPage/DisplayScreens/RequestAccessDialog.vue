<template>
  <CustomDialog
    ref="dialogRef"
    card-style="width: 250px"
  >
    <template #header>
      <q-card-section style="padding: 12px 20px">
        <div class="text-h6">Request access</div>
      </q-card-section>
    </template>

    <template #body>
      <q-card-section
        style="
          padding: 20px;
          display: flex;
          flex-direction: column;
          position: relative;
        "
      >
        <TextField
          label="Your in-group name"
          v-model="userName"
          :maxlength="maxNameLength"
        />

        <LoadingOverlay v-if="loading" />
      </q-card-section>
    </template>

    <template #footer>
      <q-card-actions
        align="right"
        style="padding: 12px 20px"
      >
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
          :disable="loading"
          @click="_sendJoinRequest()"
        />
      </q-card-actions>
    </template>
  </CustomDialog>
</template>

<script setup lang="ts">
import { maxNameLength } from '@deeplib/misc';
import { sendJoinRequest } from 'src/code/pages/operations/groups/join-requests/send';
import { selfUserName } from 'src/code/self-user-name.client';
import { handleError } from 'src/code/utils.client';
import type { Ref } from 'vue';

const props = defineProps<{
  groupId: string;
}>();

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;

const loading = ref(true);

const userName = ref('');

onMounted(async () => {
  userName.value = await selfUserName().getAsync();

  loading.value = false;
});

async function _sendJoinRequest() {
  try {
    await sendJoinRequest(props.groupId, {
      userName: userName.value,
    });

    dialogRef.value.onDialogOK();
  } catch (error: any) {
    handleError(error);
  }
}
</script>
