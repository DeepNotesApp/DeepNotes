<template>
  <ToolbarBtn
    v-if="
      $route.path.startsWith('/account/') && uiStore().width < BREAKPOINT_LG_MIN
    "
    icon="mdi-menu"
    icon-size="32px"
    btn-size="46px"
  >
    <q-menu
      anchor="bottom left"
      self="top left"
      auto-close
    >
      <q-list>
        <q-item
          clickable
          :to="{ name: 'account/general' }"
          style="padding: 16px 20px; font-size: 16px"
        >
          <q-item-section avatar>
            <q-icon name="mdi-cog" />
          </q-item-section>
          <q-item-section>General</q-item-section>
        </q-item>

        <q-item
          clickable
          :to="{ name: 'account/billing' }"
          style="padding: 16px 20px; font-size: 16px"
        >
          <q-item-section avatar>
            <q-icon name="mdi-cash-multiple" />
          </q-item-section>
          <q-item-section>Billing</q-item-section>
        </q-item>

        <q-item
          clickable
          :to="{ name: 'account/security' }"
          style="padding: 16px 20px; font-size: 16px"
        >
          <q-item-section avatar>
            <q-icon name="mdi-shield" />
          </q-item-section>
          <q-item-section>Security</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </ToolbarBtn>

  <Gap style="width: 12px" />
</template>

<script setup lang="ts">
import { BREAKPOINT_LG_MIN } from '@stdlib/misc';
</script>
