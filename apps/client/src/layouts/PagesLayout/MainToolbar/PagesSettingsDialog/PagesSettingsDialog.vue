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
          v-model="tab"
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
              :current-tab="tab"
              @set-tab="(targetTab: string) => tab = targetTab"
            />
            <TabBtn
              name="Groups"
              icon="mdi-account-group"
              :current-tab="tab"
              @set-tab="(targetTab: string) => tab = targetTab"
            />
            <TabBtn
              name="Join invitations"
              icon="mdi-calendar"
              :current-tab="tab"
              @set-tab="(targetTab: string) => tab = targetTab"
            />
            <TabBtn
              name="Join requests"
              icon="mdi-account-multiple-plus"
              :current-tab="tab"
              @set-tab="(targetTab: string) => tab = targetTab"
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
          <GeneralTab v-if="tab === 'General'" />
          <GroupsTab v-if="tab === 'Groups'" />
          <InvitationsTab v-if="tab === 'Join invitations'" />
          <RequestsTab v-if="tab === 'Join requests'" />

          <LoadingOverlay v-if="!mounted || realtimeCtx.loading" />
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

const tab = ref('General');

const groupIds = ref<string[]>([]);
provide('groupIds', groupIds);

const realtimeCtx = useRealtimeContext();
provide('realtimeCtx', realtimeCtx);

const mounted = ref(false);

onMounted(async () => {
  try {
    groupIds.value = await trpcClient.users.pages.getGroupIds.query();

    await watchUntilTrue(() => !internals.realtime.loading);

    mounted.value = true;
  } catch (error: any) {
    handleError(error);
  }
});
</script>
