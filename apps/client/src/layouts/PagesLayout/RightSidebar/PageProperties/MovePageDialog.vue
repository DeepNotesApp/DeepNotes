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
import { maxGroupNameLength, maxNameLength } from '@deeplib/misc';
import { BREAKPOINT_MD_MIN } from '@stdlib/misc';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names.client';
import { groupNames } from 'src/code/pages/computed/group-names.client';
import { movePage } from 'src/code/pages/operations/pages/move';
import { useRealtimeContext } from 'src/code/realtime/context.universal';
import { handleError } from 'src/code/utils.client';
import type { ComponentPublicInstance, Ref } from 'vue';

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;

const page = computed(() => internals.pages.react.page);

const horizontal = computed(() => uiStore().width >= BREAKPOINT_MD_MIN);

const groupIds = ref<string[]>([]);
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
    .map((groupId) => {
      if (
        realtimeCtx.hget('group', groupId, 'permanent-deletion-date') != null
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
  groupIds.value = [page.value.react.groupId];
  destGroupId.value = page.value.react.groupId;

  await Promise.all([
    (async () => {
      groupIds.value = (await internals.realtime.hget(
        'user',
        authStore().userId,
        'recent-group-ids',
      )) ?? [page.value.react.groupId];
    })(),

    (async () => {
      groupMemberName.value = (
        await groupMemberNames()(
          `${page.value.react.groupId}:${authStore().userId}`,
        ).getAsync()
      ).text;
    })(),
  ]);
});

async function _movePage() {
  try {
    await movePage(page.value.id, {
      currentGroupId: page.value.react.groupId,
      setAsMainPage: setAsMainPage.value,

      createGroup: destGroupId.value === 'new',
      groupName: groupName.value,
      groupMemberName: groupMemberName.value,
      groupIsPublic: groupIsPublic.value,
      groupPassword: groupIsPasswordProtected.value
        ? groupPassword.value
        : undefined,
    });

    $quasar().notify({
      message: 'Page moved successfully.',
      color: 'positive',
    });

    dialogRef.value.onDialogOK();

    if (setAsMainPage.value) {
      internals.pages.react.pathPageIds.length = 0;
      await internals.pages.updateCurrentPath(page.value.id);
    }
  } catch (error: any) {
    handleError(error);
  }
}
</script>
