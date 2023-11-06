<template>
  <CustomDialog
    ref="dialogRef"
    :maximized="maximized"
    :card-style="{
      'max-width': 'unset',
      width: maximized ? undefined : '800px',
      height: maximized ? undefined : '600px',
    }"
  >
    <template #header>
      <q-card-section style="display: flex">
        <div class="text-h5">Group Settings</div>

        <q-space />

        <DeepBtn
          icon="mdi-close"
          color="primary"
          flat
          round
          style="margin: -5px; height: 42px"
          @click="dialogRef.onDialogCancel()"
        />
      </q-card-section>

      <template v-if="maximized">
        <q-separator />

        <q-tabs
          v-model="tab"
          inline-label
          outside-arrows
          mobile-arrows
        >
          <q-tab
            name="General"
            icon="mdi-account-group"
            label="General"
          />

          <q-tab
            v-if="
              (realtimeCtx.hget(
                'group-member',
                `${groupId}:${authStore().userId}`,
                'exists',
              ) ||
                realtimeCtx.hget('group', groupId, 'is-public')) &&
              !loading
            "
            name="Pages"
            icon="mdi-account-group"
            label="Pages"
          />

          <template
            v-if="
              groupId !== internals.personalGroupId &&
              rolesMap()[
                realtimeCtx.hget(
                  'group-member',
                  `${groupId}:${authStore().userId}`,
                  'role',
                )
              ]?.permissions.viewGroupPages &&
              !loading
            "
          >
            <q-tab
              name="Members"
              icon="mdi-wallet-membership"
              label="Members"
            />

            <template
              v-if="
                rolesMap()[
                  realtimeCtx.hget(
                    'group-member',
                    `${groupId}:${authStore().userId}`,
                    'role',
                  )
                ]?.permissions.manageLowerRanks
              "
            >
              <q-tab
                name="Join invitations"
                icon="mdi-calendar"
                label="Join invitations"
              />

              <q-tab
                name="Join requests"
                icon="mdi-account-multiple-plus"
                label="Join requests"
              />
            </template>
          </template>
        </q-tabs>
      </template>
    </template>

    <template #body>
      <q-card-section style="flex: 1; height: 0; display: flex; padding: 0">
        <template v-if="!maximized">
          <q-list style="flex: none; width: 200px">
            <TabBtn
              name="General"
              icon="mdi-account-group"
              :current-tab="tab"
              @set-tab="(targetTab: string) => (tab = targetTab)"
            />

            <TabBtn
              v-if="
                (realtimeCtx.hget(
                  'group-member',
                  `${groupId}:${authStore().userId}`,
                  'exists',
                ) ||
                  realtimeCtx.hget('group', groupId, 'is-public')) &&
                !loading
              "
              name="Pages"
              icon="mdi-note"
              :current-tab="tab"
              @set-tab="(targetTab: string) => (tab = targetTab)"
            />

            <template
              v-if="
                groupId !== internals.personalGroupId &&
                rolesMap()[
                  realtimeCtx.hget(
                    'group-member',
                    `${groupId}:${authStore().userId}`,
                    'role',
                  )
                ]?.permissions.viewGroupPages &&
                !loading
              "
            >
              <TabBtn
                name="Members"
                icon="mdi-wallet-membership"
                :current-tab="tab"
                @set-tab="(targetTab: string) => (tab = targetTab)"
              />

              <template
                v-if="
                  rolesMap()[
                    realtimeCtx.hget(
                      'group-member',
                      `${groupId}:${authStore().userId}`,
                      'role',
                    )
                  ]?.permissions.manageLowerRanks
                "
              >
                <TabBtn
                  name="Join invitations"
                  icon="mdi-calendar"
                  :current-tab="tab"
                  @set-tab="(targetTab: string) => (tab = targetTab)"
                />

                <TabBtn
                  name="Join requests"
                  icon="mdi-account-multiple-plus"
                  :current-tab="tab"
                  @set-tab="(targetTab: string) => (tab = targetTab)"
                />
              </template>
            </template>
          </q-list>

          <q-separator vertical />
        </template>

        <div
          style="
            flex: 1;
            padding: 32px;
            display: flex;
            flex-direction: column;
            position: relative;
            overflow: auto;
          "
        >
          <GeneralTab v-if="tab === 'General'" />
          <PagesTab v-if="tab === 'Pages'" />
          <MembersTab v-if="tab === 'Members'" />
          <InvitationsTab v-if="tab === 'Join invitations'" />
          <RequestsTab v-if="tab === 'Join requests'" />

          <LoadingOverlay v-if="loading" />
        </div>
      </q-card-section>
    </template>

    <template #footer>
      <q-card-actions align="right">
        <DeepBtn
          flat
          label="Close"
          color="primary"
          @click="dialogRef.onDialogOK()"
        />
      </q-card-actions>
    </template>
  </CustomDialog>
</template>

<script setup lang="ts">
import { rolesMap } from '@deeplib/misc';
import { sleep } from '@stdlib/misc';
import { watchUntilTrue } from '@stdlib/vue';
import { useRealtimeContext } from 'src/code/realtime/context';
import { handleError } from 'src/code/utils/misc';
import type { Ref } from 'vue';

import GeneralTab from './GeneralTab/GeneralTab.vue';
import InvitationsTab from './InvitationsTab/InvitationsTab.vue';
import MembersTab from './MembersTab/MembersTab.vue';
import PagesTab from './PagesTab/PagesTab.vue';
import RequestsTab from './RequestsTab/RequestsTab.vue';

const props = defineProps<{
  groupId: string;
  initialTab?: string;
}>();

provide('groupId', props.groupId);

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;
provide('dialog', dialogRef);

const pageIds = ref<string[]>([]);
const hasMorePages = ref(true);
provide('pageIds', pageIds);
provide('hasMorePages', hasMorePages);

const maximized = computed(
  () => uiStore().width < 800 || uiStore().height < 600,
);

const tab = ref(props.initialTab ?? 'General');

const realtimeCtx = useRealtimeContext();
provide('realtimeCtx', realtimeCtx);

const loading = ref(true);

onMounted(async () => {
  try {
    if (
      pagesStore().groups[props.groupId] == null &&
      props.groupId !== internals.personalGroupId &&
      authStore().loggedIn
    ) {
      const groupUserIds = await trpcClient.groups.getUserIds.query({
        groupId: props.groupId,
      });

      pagesStore().groups[props.groupId] = {
        userIds: new Set(groupUserIds),
      };
    }

    await sleep();

    await watchUntilTrue(() => !internals.realtime.loading);

    loading.value = false;
  } catch (error) {
    handleError(error);
  }
});
</script>
