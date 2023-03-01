<template>
  <DeepBtn
    v-if="$route.path.startsWith('/account/')"
    icon="mdi-menu"
    flat
    class="d-flex d-lg-none"
    style="font-size: 20px"
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
  </DeepBtn>
</template>
