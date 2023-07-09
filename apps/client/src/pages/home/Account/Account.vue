<template>
  <q-page style="display: flex; flex-direction: column">
    <ResponsiveContainer
      style="
        margin-top: 48px;
        margin-bottom: 150px;
        flex: 1;
        display: flex;
        flex-direction: column;
      "
    >
      <div
        class="row"
        style="flex: 1"
      >
        <div class="d-none d-lg-block col-3">
          <q-list
            style="position: sticky"
            :style="{ top: `${uiStore().headerHeight + 56}px` }"
          >
            <q-item
              style="height: 60px"
              clickable
              :to="{ name: 'account/general' }"
            >
              <q-item-section avatar>
                <q-icon name="mdi-cog" />
              </q-item-section>
              <q-item-section>General</q-item-section>
            </q-item>

            <q-item
              v-if="!($q.platform.is.capacitor && $q.platform.is.ios)"
              style="height: 60px"
              clickable
              :to="{ name: 'account/billing' }"
            >
              <q-item-section avatar>
                <q-icon name="mdi-cash-multiple" />
              </q-item-section>
              <q-item-section>Billing</q-item-section>
            </q-item>

            <q-item
              style="height: 60px"
              clickable
              :to="{ name: 'account/security' }"
            >
              <q-item-section avatar>
                <q-icon name="mdi-shield" />
              </q-item-section>
              <q-item-section>Security</q-item-section>
            </q-item>
          </q-list>
        </div>

        <div class="col-12 col-lg-9 page-content">
          <router-view />
        </div>
      </div>
    </ResponsiveContainer>
  </q-page>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped>
.page-content {
  position: relative;

  display: flex;
  flex-direction: column;

  padding-left: 0;
  padding-top: 20px;

  @media (min-width: $breakpoint-lg-min) {
    padding-left: 36px;
  }
}
</style>
