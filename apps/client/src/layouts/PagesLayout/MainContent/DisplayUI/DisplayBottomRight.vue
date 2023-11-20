<template>
  <div
    style="
      position: absolute;

      bottom: 12px;
      right: 14px;

      text-align: right;

      pointer-events: none;

      font-size: 12px;
    "
  >
    <div
      v-if="page.selection.react.elems.length > 0"
      class="selection-count"
    >
      {{ page.selection.react.elems.length }}
      item{{ page.selection.react.elems.length > 1 ? 's' : '' }} selected
    </div>

    <div
      v-if="page.react.status === 'success' && page.react.readOnly"
      style="margin-top: 3px"
    >
      Read-only page{{ subscriptionExpired ? ' (Subscription expired)' : '' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { rolesMap } from '@deeplib/misc';
import { useRealtimeContext } from 'src/code/realtime/context';

const page = computed(() => internals.pages.react.page);

const realtimeCtx = useRealtimeContext();

const subscriptionExpired = computed(
  () =>
    page.value.react.readOnly &&
    realtimeCtx.hget('user', authStore().userId, 'plan') !== 'pro' &&
    rolesMap()[
      realtimeCtx.hget(
        'group-member',
        `${page.value.react.groupId}:${authStore().userId}`,
        'role',
      )
    ]?.permissions.editGroupPages,
);
</script>

<style scoped lang="scss">
.selection-count {
  color: lighten(#006dd2, 23%);
}
</style>
