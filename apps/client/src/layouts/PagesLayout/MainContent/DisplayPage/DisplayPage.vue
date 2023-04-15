<template>
  <div
    class="display-page"
    :data-page-id="page.id"
  >
    <DisplayScreens />

    <DOMDisplay
      :region="page"
      class="display-overlay"
      style="text-align: center"
      :data-page-id="page.id"
    />

    <LoadingOverlay v-if="page.react.loading || page.react.status == null" />
  </div>
</template>

<script setup lang="ts">
/* eslint-disable vue/no-mutating-props */

import { DataLayer } from '@stdlib/crypto';
import { groupContentKeyrings } from 'src/code/pages/computed/group-content-keyrings';
import { pageGroupIds } from 'src/code/pages/computed/page-group-id';
import { pageKeyrings } from 'src/code/pages/computed/page-keyrings';
import type { Page } from 'src/code/pages/page/page';
import { useRealtimeContext } from 'src/code/realtime/context';

import DisplayScreens from './DisplayScreens/DisplayScreens.vue';
import DOMDisplay from './DisplayScreens/DisplayWorld/DOMDisplay.vue';

const componentLogger = mainLogger.sub('DisplayPage');

const props = defineProps<{
  page: Page;
}>();

provide('page', props.page);

const realtimeCtx = useRealtimeContext();

watchEffect(() => {
  // Subscribe to required values

  componentLogger.info('Subscribing to required values');

  const userPlan = realtimeCtx.hget('user', authStore().userId, 'plan');

  const pageIsDeleted = !!realtimeCtx.hget(
    'page',
    props.page.id,
    'permanent-deletion-date',
  );

  const pageIsPermanentlyDeleted = !pageIsDeleted
    ? false
    : new Date() >
      realtimeCtx.hget('page', props.page.id, 'permanent-deletion-date');

  const pageIsFree = !!realtimeCtx.hget('page', props.page.id, 'free');

  const groupId = pageGroupIds()(props.page.id).get();

  const groupIsDeleted =
    groupId == null
      ? false
      : !!realtimeCtx.hget('group', groupId, 'permanent-deletion-date');

  const groupIsPermanentlyDeleted =
    groupId == null || !groupIsDeleted
      ? false
      : new Date() >
        realtimeCtx.hget('group', groupId, 'permanent-deletion-date');

  const groupIsPersonal =
    groupId == null
      ? false
      : !!realtimeCtx.hget('group', groupId, 'is-personal');

  const groupIsPublic =
    groupId == null ? false : realtimeCtx.hget('group', groupId, 'is-public');

  const groupJoinRequestRejected =
    groupId == null || authStore().userId == null
      ? false
      : realtimeCtx.hget(
          'group-join-request',
          `${groupId}:${authStore().userId}`,
          'rejected',
        );

  const groupJoinInvitationExists =
    groupId == null || authStore().userId == null
      ? false
      : !!realtimeCtx.hget(
          'group-join-invitation',
          `${groupId}:${authStore().userId}`,
          'exists',
        );

  const groupMemberRole =
    groupId == null || authStore().userId == null
      ? null
      : realtimeCtx.hget(
          'group-member',
          `${groupId}:${authStore().userId}`,
          'role',
        );

  const groupContentKeyring =
    groupId == null ? null : groupContentKeyrings()(groupId).get();

  const pageKeyring =
    groupId == null
      ? null
      : pageKeyrings()(`${groupId}:${props.page.id}`).get();

  if (
    realtimeCtx.changed.size === 1 &&
    realtimeCtx.changed.has(`page:${props.page.id}>encrypted-symmetric-keyring`)
  ) {
    $quasar().notify({
      message: 'Successfully rotated encryption key.',
      type: 'positive',
    });
  }

  props.page.setStatus(undefined, true);

  props.page.collab.websocket.disconnect();

  // Skip on page key change

  componentLogger.info('Checking if all required values arrived');

  if (realtimeCtx.loading) {
    componentLogger.info('Missing required values: %o', realtimeCtx.pending);
    return;
  }

  componentLogger.info("Checking if page doesn't exist");

  if (
    groupId == null ||
    pageIsPermanentlyDeleted ||
    groupIsPermanentlyDeleted
  ) {
    props.page.setStatus('page-nonexistent');
    return;
  }

  componentLogger.info('Checking if group is deleted');

  if (groupIsDeleted) {
    props.page.setStatus('group-deleted');
    return;
  }

  componentLogger.info('Checking if page is deleted');

  if (pageIsDeleted) {
    props.page.setStatus('page-deleted');
    return;
  }

  componentLogger.info('Checking if user was rejected from group');

  if (groupJoinRequestRejected) {
    props.page.setStatus('rejected');
    return;
  }

  componentLogger.info('Checking if user was invited to group');

  if (groupJoinInvitationExists) {
    props.page.setStatus('invited');
    return;
  }

  componentLogger.info('Checking if user is not authorized');

  if (!groupIsPublic && groupMemberRole == null) {
    props.page.setStatus('unauthorized');
    return;
  }

  componentLogger.info('Checking if user has a Pro plan');

  if (
    !groupIsPersonal &&
    !groupIsPublic &&
    userPlan !== 'pro' &&
    groupId !== internals.personalGroupId
  ) {
    props.page.setStatus('pro-plan-required');
    return;
  }

  componentLogger.info('Checking if page is non-free');

  if (!groupIsPublic && userPlan !== 'pro' && !pageIsFree) {
    props.page.setStatus('non-free-page');
    return;
  }

  componentLogger.info('Checking if group is password protected');

  if (groupContentKeyring?.topLayer === DataLayer.Symmetric) {
    props.page.setStatus('password');
    return;
  }

  componentLogger.info('Checking if can finish setup');

  if (pageKeyring?.topLayer === DataLayer.Raw) {
    void props.page.finishSetup();
    return;
  }

  componentLogger.info('Loading...');
});
</script>

<style lang="scss" scoped>
.display-page {
  position: absolute;

  inset: 0;

  isolation: isolate;

  :deep() {
    a {
      text-decoration: none;

      color: unset;

      outline: none;
    }

    * {
      touch-action: none;
    }
  }
}
</style>
