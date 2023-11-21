<template>
  <CustomDialog ref="dialogRef">
    <template #header>
      <q-card-section
        style="padding: 12px 20px"
        class="text-h6"
      >
        Move page
      </q-card-section>
    </template>

    <template #body>
      <q-card-section style="padding: 0">
        <div
          style="display: flex"
          :style="{
            'flex-direction': horizontal ? 'row' : 'column',
          }"
        >
          <div style="padding: 20px; width: 260px">
            <q-select
              label="Destination group"
              :options="groupOptions"
              option-label="name"
              option-value="id"
              filled
              emit-value
              map-options
              v-model="destGroupId"
            />

            <Gap style="height: 16px" />

            <Checkbox
              label="Set as group's main page"
              :disable="destGroupId === 'new'"
              :model-value="setAsMainPage || destGroupId === 'new'"
              @update:model-value="(value) => (setAsMainPage = value)"
            />
          </div>

          <template v-if="destGroupId === 'new'">
            <q-separator :vertical="horizontal" />

            <div style="padding: 20px; width: 260px">
              <div style="font-size: 20px; font-weight: bold">New group:</div>

              <Gap style="height: 8px" />

              <TextField
                ref="groupNameElem"
                label="Group name"
                v-model="groupName"
                :maxlength="maxGroupNameLength"
              />

              <Gap style="height: 16px" />

              <Checkbox
                label="Public for viewing"
                v-model="groupIsPublic"
              />

              <Gap style="height: 16px" />

              <Checkbox
                label="Password protected"
                v-model="groupIsPasswordProtected"
              />

              <template v-if="groupIsPasswordProtected">
                <Gap style="height: 16px" />

                <EvaluatedPasswordField
                  label="Group password"
                  autocomplete="new-password"
                  v-model="groupPassword"
                />
              </template>

              <Gap style="height: 16px" />

              <TextField
                label="Your in-group name"
                v-model="groupMemberName"
                :maxlength="maxNameLength"
              />
            </div>
          </template>
        </div>
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
          @click.prevent="_movePage()"
        />
      </q-card-actions>
    </template>
  </CustomDialog>
</template>

<script setup lang="ts">
import { maxGroupNameLength, maxNameLength, rolesMap } from '@deeplib/misc';
import { BREAKPOINT_MD_MIN } from '@stdlib/misc';
import type { movePage } from 'src/code/api-interface/pages/move';
import { groupNames } from 'src/code/pages/computed/group-names';
import { useRealtimeContext } from 'src/code/realtime/context';
import { selfUserName } from 'src/code/self-user-name';
import type { ComponentPublicInstance, Ref } from 'vue';

const props = defineProps<{
  groupId: string;
}>();

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;

const horizontal = computed(() => uiStore().width >= BREAKPOINT_MD_MIN);

const groupIds = ref<string[]>([]);
const groupMemberRoles = ref<string[]>([]);
const destGroupId = ref<string>();

const setAsMainPage = ref(false);

// Group creation

const groupName = ref('');
const groupNameElem = ref<ComponentPublicInstance>();

const groupIsPublic = ref(false);

const groupIsPasswordProtected = ref(false);
const groupPassword = ref('');

const groupMemberName = ref('');

const realtimeCtx = useRealtimeContext();

const groupOptions = computed(() => [
  { id: 'new', name: '(New group)' },
  ...groupIds.value
    .map((groupId, groupIndex) => {
      if (
        realtimeCtx.hget('group', groupId, 'permanent-deletion-date') != null
      ) {
        return;
      }

      if (
        groupId !== internals.pages.react.page.react.groupId &&
        !rolesMap()[groupMemberRoles.value[groupIndex]]?.permissions
          .editGroupPages
      ) {
        return;
      }

      const groupName = groupNames()(groupId).get();

      if (groupName.status === 'success') {
        return { id: groupId, name: groupName.text };
      }
    })
    .filter((item) => item != null),
]);

onMounted(async () => {
  destGroupId.value = props.groupId;
  groupIds.value = [props.groupId];

  await Promise.all([
    (async () => {
      groupIds.value = (await internals.realtime.hget(
        'user',
        authStore().userId,
        'recent-group-ids',
      )) ?? [props.groupId];

      groupMemberRoles.value = await Promise.all(
        groupIds.value.map((groupId) =>
          internals.realtime.hget(
            'group-member',
            `${groupId}:${authStore().userId}`,
            'role',
          ),
        ),
      );
    })(),

    (async () => {
      groupMemberName.value = await selfUserName().getAsync();
    })(),
  ]);
});

async function _movePage() {
  dialogRef.value.onDialogOK({
    destGroupId: destGroupId.value!,
    setAsMainPage: setAsMainPage.value,

    ...(destGroupId.value === 'new'
      ? {
          groupCreation: {
            groupName: groupName.value,
            groupMemberName: groupMemberName.value,
            groupIsPublic: groupIsPublic.value,
            groupPassword: groupIsPasswordProtected.value
              ? groupPassword.value
              : undefined,
          },
        }
      : {}),
  } as Parameters<typeof movePage>[0]);
}
</script>
