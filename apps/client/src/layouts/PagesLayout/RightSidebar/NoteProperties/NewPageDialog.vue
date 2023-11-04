<template>
  <CustomDialog ref="dialogRef">
    <template #header>
      <q-card-section style="padding: 12px 20px">
        <div class="text-h6">Create new page</div>
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
            <TextField
              label="Page title"
              ref="pageRelativeTitleElem"
              v-model="pageRelativeTitle"
              :maxlength="maxPageTitleLength"
            />

            <Gap style="height: 16px" />

            <q-select
              label="Destination group"
              :options="groupOptions"
              option-label="name"
              option-value="id"
              filled
              emit-value
              map-options
              :model-value="destGroupId"
              @update:model-value="
                async (value) => {
                  if (value === 'new') {
                    groupName = pageRelativeTitle;
                    pageRelativeTitle = 'Main page';

                    await $nextTick();

                    groupNameElem?.$el.focus();
                  } else if (destGroupId === 'new') {
                    pageRelativeTitle = groupName;

                    await $nextTick();

                    pageRelativeTitleElem?.$el.focus();
                  }

                  destGroupId = value;
                }
              "
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
          @click.prevent="_createPage()"
        />
      </q-card-actions>
    </template>
  </CustomDialog>
</template>

<script setup lang="ts">
import {
  maxGroupNameLength,
  maxNameLength,
  maxPageTitleLength,
  rolesMap,
} from '@deeplib/misc';
import { BREAKPOINT_MD_MIN, sleep } from '@stdlib/misc';
import { createPage } from 'src/code/api-interface/pages/create';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names';
import { groupNames } from 'src/code/pages/computed/group-names';
import { useRealtimeContext } from 'src/code/realtime/context';
import { handleError } from 'src/code/utils/misc';
import type { ComponentPublicInstance, Ref } from 'vue';

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;

const props = defineProps<{
  initialPageTitle: string;
}>();

const page = computed(() => internals.pages.react.page);

const horizontal = computed(() => uiStore().width >= BREAKPOINT_MD_MIN);

const pageRelativeTitle = ref(props.initialPageTitle);
const pageRelativeTitleElem = ref<ComponentPublicInstance>();

const realtimeCtx = useRealtimeContext();

const groupIds = ref<string[]>([]);
const groupMemberRoles = ref<string[]>([]);

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

const destGroupId = ref('');

// Group creation

const groupName = ref('');
const groupNameElem = ref<ComponentPublicInstance>();

const groupIsPublic = ref(false);

const groupIsPasswordProtected = ref(false);
const groupPassword = ref('');

const groupMemberName = ref('');

onMounted(async () => {
  // Initialize group IDs

  groupIds.value = [page.value.react.groupId];

  // Focus page title

  await sleep();

  pageRelativeTitleElem.value?.$el.focus();

  // Load recent group IDs

  await Promise.all([
    (async () => {
      groupIds.value = (await internals.realtime.hget(
        'user',
        authStore().userId,
        'recent-group-ids',
      )) ?? [page.value.react.groupId];

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
      groupMemberName.value = (
        await groupMemberNames()(
          `${page.value.react.groupId}:${authStore().userId}`,
        ).getAsync()
      ).text;
    })(),
  ]);

  destGroupId.value = page.value.react.groupId;
});

async function _createPage() {
  try {
    if (pageRelativeTitle.value === '') {
      pageRelativeTitleElem.value?.$el.focus();

      throw new Error('Please enter a page title.');
    }

    const response = await createPage({
      parentPageId: page.value.id,
      destGroupId: destGroupId.value,

      pageRelativeTitle: pageRelativeTitle.value,

      createGroup:
        destGroupId.value === 'new'
          ? {
              groupName: groupName.value,
              groupMemberName: groupMemberName.value,
              groupIsPublic: groupIsPublic.value,
              groupPassword: groupIsPasswordProtected.value
                ? groupPassword.value
                : undefined,
            }
          : undefined,
    });

    dialogRef.value.onDialogOK(
      /* destGroupId.value === 'new' // Buggy, implement later
      ? `/groups/${request.groupId}`
      : */ `/pages/${response.pageId}`,
    );

    await internals.pages.goToPage(response.pageId, { fromParent: true });

    $quasar().notify({
      message:
        'Page created successfully.' +
        (response.numFreePages != null
          ? ` (${response.numFreePages + 1}/50)`
          : ''),
      type: 'positive',
    });
  } catch (error) {
    handleError(error);
  }
}
</script>
