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
        <div class="text-h5">Pages Settings</div>

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
          v-model="settings.tab"
          inline-label
          outside-arrows
          mobile-arrows
        >
          <q-tab
            name="General"
            icon="mdi-account"
            label="General"
          />
          <q-tab
            name="Groups"
            icon="mdi-account-group"
            label="Groups"
          />
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
        </q-tabs>
      </template>
    </template>

    <template #body>
      <q-card-section style="flex: 1; height: 0; display: flex; padding: 0">
        <template v-if="!maximized">
          <q-list style="flex: none; width: 200px">
            <TabBtn
              name="General"
              icon="mdi-account"
              :settings="settings"
            />
            <TabBtn
              name="Groups"
              icon="mdi-account-group"
              :settings="settings"
            />
            <TabBtn
              name="Join invitations"
              icon="mdi-calendar"
              :settings="settings"
            />
            <TabBtn
              name="Join requests"
              icon="mdi-account-multiple-plus"
              :settings="settings"
            />
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
          "
        >
          <GeneralTab v-if="settings.tab === 'General'" />
          <GroupsTab v-if="settings.tab === 'Groups'" />
          <InvitationsTab v-if="settings.tab === 'Join invitations'" />
          <RequestsTab v-if="settings.tab === 'Join requests'" />

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

<script lang="ts">
export function initialSettings() {
  return {
    tab: 'General',

    general: {},
    groups: {
      selectedGroupIds: new Set<string>(),
    },
    invitations: {
      selectedGroupIds: new Set<string>(),
    },
    requests: {
      selectedGroupIds: new Set<string>(),
    },

    groupIds: [] as string[],
  };
}
</script>

<script setup lang="ts">
import { watchUntilTrue } from '@stdlib/vue';
import { useRealtimeContext } from 'src/code/realtime/context';
import { handleError } from 'src/code/utils';
import type { Ref } from 'vue';

import GeneralTab from './GeneralTab.vue';
import GroupsTab from './GroupsTab.vue';
import InvitationsTab from './InvitationsTab.vue';
import RequestsTab from './RequestsTab.vue';

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;
provide('dialog', dialogRef);

const maximized = computed(
  () => uiStore().width < 800 || uiStore().height < 600,
);

const settings = ref(initialSettings());
provide('settings', settings);

const realtimeCtx = useRealtimeContext();
provide('realtimeCtx', realtimeCtx);

const mounted = ref(false);
const loading = computed(() => !mounted.value || internals.realtime.loading);

onMounted(async () => {
  try {
    const request = (
      await api().post<{
        groupIds: string[];
      }>('/api/users/load-settings')
    ).data;

    settings.value.groupIds = request.groupIds;

    await watchUntilTrue(() => !internals.realtime.loading);

    mounted.value = true;
  } catch (error: any) {
    handleError(error);
  }
});
</script>
