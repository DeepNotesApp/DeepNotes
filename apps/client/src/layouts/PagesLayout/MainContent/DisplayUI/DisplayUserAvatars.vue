<template>
  <div style="position: absolute; inset: 0; pointer-events: none">
    <div
      v-for="(userState, index) in page.collab.presence.react.userStates"
      :key="userState[0]"
      class="display-user-avatar"
      :style="{
        left: `${($q.platform.is.mobile ? 82 : 20) + 44 * index}px`,

        'background-color': userState[1].user.color,
      }"
    >
      {{ getNameInitials(userState[1].user.name ?? '') }}

      <q-tooltip
        anchor="top middle"
        self="bottom middle"
        transition-show="jump-up"
        transition-hide="jump-down"
      >
        {{ userState[1].user.name }}
      </q-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getNameInitials } from 'src/code/utils/misc.js';

const $q = useQuasar();

const page = computed(() => internals.pages.react.page);
</script>

<style scoped>
.display-user-avatar {
  position: absolute;
  bottom: 20px;

  border-radius: 9999px;

  width: 34px;
  height: 34px;

  display: flex;
  justify-content: center;
  align-items: center;

  pointer-events: auto;

  font-weight: bold;
}
</style>
