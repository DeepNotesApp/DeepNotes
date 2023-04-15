<template>
  <CustomDialog ref="dialogRef">
    <template #header>
      <q-card-section style="padding: 12px 20px">
        <div class="text-h6">Invite user</div>
      </q-card-section>
    </template>

    <template #body>
      <q-card-section style="padding: 20px">
        <TextField
          label="User ID or Email"
          dense
          v-model="identity"
          :maxlength="maxEmailLength"
        />

        <Gap style="height: 16px" />

        <TextField
          label="Display name"
          dense
          v-model="userName"
          :maxlength="maxNameLength"
        />

        <Gap style="height: 16px" />

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
          @click.prevent="inviteUser()"
        />
      </q-card-actions>
    </template>
  </CustomDialog>
</template>

<script setup lang="ts">
import type { GroupRoleID } from '@deeplib/misc';
import { canManageRole } from '@deeplib/misc';
import { maxNameLength, roles, rolesMap } from '@deeplib/misc';
import { isNanoID, maxEmailLength, w3cEmailRegex } from '@stdlib/misc';
import { sendJoinInvitation } from 'src/code/api-interface/groups/join-invitations/send';
import { useRealtimeContext } from 'src/code/realtime/context';
import { handleError } from 'src/code/utils';
import type { Ref } from 'vue';
import { z } from 'zod';

const props = defineProps<{
  groupId: string;
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

const identity = ref<string>('');
const userName = ref<string>('');
const role = ref<GroupRoleID | null>(null);

async function inviteUser() {
  try {
    if (
      !z
        .string()
        .refine(isNanoID)
        .or(z.string().regex(w3cEmailRegex))
        .safeParse(identity.value).success
    ) {
      throw new Error('Invalid email or user ID.');
    }

    if (userName.value === '') {
      throw new Error('Please enter a display name.');
    }

    if (role.value == null) {
      throw new Error('Please select a role.');
    }

    let inviteeUserId;

    if (isNanoID(identity.value)) {
      inviteeUserId = identity.value;
    } else {
      inviteeUserId = await internals.realtime.hget(
        'email',
        identity.value,
        'user-id',
      );
    }

    await sendJoinInvitation({
      groupId: props.groupId,
      inviteeUserId,
      inviteeUserName: userName.value,
      inviteeRole: role.value,
    });

    dialogRef.value.onDialogOK();
  } catch (error: any) {
    handleError(error);
  }
}
</script>
