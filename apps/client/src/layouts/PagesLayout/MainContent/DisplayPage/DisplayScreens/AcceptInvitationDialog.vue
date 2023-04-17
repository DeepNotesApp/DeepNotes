<template>
  <CustomDialog
    ref="dialogRef"
    card-style="width: 250px"
  >
    <template #header>
      <q-card-section style="padding: 12px 20px">
        <div class="text-h6">Accept invitation</div>
      </q-card-section>
    </template>

    <template #body>
      <q-card-section
        style="
          position: relative;
          padding: 20px;
          display: flex;
          flex-direction: column;
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
          @click="accept()"
        />
      </q-card-actions>
    </template>
  </CustomDialog>
</template>

<script setup lang="ts">
import { maxNameLength } from '@deeplib/misc';
import { acceptJoinInvitation } from 'src/code/api-interface/groups/join-invitations/accept';
import { selfUserName } from 'src/code/self-user-name';
import { handleError } from 'src/code/utils/misc.js';
import type { Ref } from 'vue';

const props = defineProps<{
  groupIds: string[];
}>();

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;

const loading = ref(true);
const userName = ref('');

onMounted(async () => {
  userName.value = await selfUserName().getAsync();

  loading.value = false;
});

async function accept() {
  try {
    for (const groupId of props.groupIds) {
      await acceptJoinInvitation({
        groupId,
        userName: userName.value,
      });
    }

    dialogRef.value.onDialogOK(userName.value);
  } catch (error) {
    handleError(error);
  }
}
</script>
