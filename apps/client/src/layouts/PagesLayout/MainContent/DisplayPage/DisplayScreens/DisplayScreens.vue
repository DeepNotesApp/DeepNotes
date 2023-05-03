<template>
  <div
    class="display-screens"
    :data-page-id="page.id"
  >
    <DisplayErrorScreen v-if="page.react.status === 'error'" />
    <DisplayNonExistentScreen
      v-else-if="page.react.status === 'page-nonexistent'"
    />
    <DisplayProPlanRequiredScreen
      v-else-if="page.react.status === 'pro-plan-required'"
    />
    <DisplayNonFreePageScreen
      v-else-if="page.react.status === 'non-free-page'"
    />
    <DisplayPageDeletedScreen
      v-else-if="page.react.status === 'page-deleted'"
    />
    <DisplayGroupDeletedScreen
      v-else-if="page.react.status === 'group-deleted'"
    />
    <DisplayInvitedScreen v-else-if="page.react.status === 'invited'" />
    <DisplayRejectedScreen v-else-if="page.react.status === 'rejected'" />
    <DisplayUnauthorizedScreen
      v-else-if="page.react.status === 'unauthorized'"
    />
    <DisplayPasswordScreen v-else-if="page.react.status === 'password'" />
    <DisplayWorld v-else-if="page.react.status === 'success'" />
  </div>
</template>

<script setup lang="ts">
import type { Page } from 'src/code/pages/page/page';

import DisplayErrorScreen from './DisplayErrorScreen.vue';
import DisplayGroupDeletedScreen from './DisplayGroupDeletedScreen.vue';
import DisplayInvitedScreen from './DisplayInvitedScreen.vue';
import DisplayNonExistentScreen from './DisplayNonExistentScreen.vue';
import DisplayNonFreePageScreen from './DisplayNonFreePageScreen.vue';
import DisplayPageDeletedScreen from './DisplayPageDeletedScreen.vue';
import DisplayPasswordScreen from './DisplayPasswordScreen.vue';
import DisplayProPlanRequiredScreen from './DisplayProPlanRequiredScreen.vue';
import DisplayRejectedScreen from './DisplayRejectedScreen.vue';
import DisplayUnauthorizedScreen from './DisplayUnauthorizedScreen.vue';
import DisplayWorld from './DisplayWorld/DisplayWorld.vue';

const page = inject<Page>('page')!;
</script>

<style scoped>
.display-screens {
  position: absolute;

  inset: 0;

  overflow: hidden;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  text-align: center;

  padding: 32px;
}
</style>
