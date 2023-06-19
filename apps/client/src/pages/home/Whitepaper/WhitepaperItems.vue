<template>
  <q-item
    clickable
    dense
    style="font-weight: bold; font-size: 18px"
    @click="scrollToAnchor('overview')"
  >
    <q-item-section>Overview</q-item-section>
  </q-item>

  <q-item
    clickable
    dense
    @click="scrollToAnchor('encryption-practices')"
  >
    <q-item-section style="padding-left: 24px">
      Encryption practices
    </q-item-section>
  </q-item>

  <q-item
    clickable
    dense
    @click="scrollToAnchor('encryption-key-hierarchy')"
  >
    <q-item-section style="padding-left: 24px">
      Encryption key hierarchy
    </q-item-section>
  </q-item>

  <q-item
    clickable
    dense
    @click="scrollToAnchor('realtime-collaboration')"
  >
    <q-item-section style="padding-left: 24px">
      Live collaboration
    </q-item-section>
  </q-item>

  <q-item
    clickable
    dense
    @click="scrollToAnchor('password-protected-groups')"
  >
    <q-item-section style="padding-left: 24px">
      Password protected groups
    </q-item-section>
  </q-item>

  <q-item
    clickable
    dense
    @click="scrollToAnchor('public-groups')"
  >
    <q-item-section style="padding-left: 24px"> Public groups </q-item-section>
  </q-item>

  <Gap style="height: 16px" />

  <q-item
    clickable
    dense
    style="font-weight: bold; font-size: 18px"
    @click="scrollToAnchor('operations')"
  >
    <q-item-section>Operations</q-item-section>
  </q-item>

  <q-item
    clickable
    dense
    @click="scrollToAnchor('registering-a-user')"
  >
    <q-item-section style="padding-left: 24px">
      Registering a user
    </q-item-section>
  </q-item>

  <q-item
    clickable
    dense
    @click="scrollToAnchor('authenticating-a-user')"
  >
    <q-item-section style="padding-left: 24px">
      Authenticating a user
    </q-item-section>
  </q-item>

  <q-item
    clickable
    dense
    @click="scrollToAnchor('refreshing-a-session')"
  >
    <q-item-section style="padding-left: 24px">
      Refreshing a session
    </q-item-section>
  </q-item>

  <q-item
    clickable
    dense
    @click="scrollToAnchor('adding-a-group-member')"
  >
    <q-item-section style="padding-left: 24px">
      Adding a group member
    </q-item-section>
  </q-item>

  <q-item
    clickable
    dense
    @click="scrollToAnchor('removing-a-group-member')"
  >
    <q-item-section style="padding-left: 24px">
      Removing a group member
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
function scrollToAnchor(anchor: string) {
  const targetTop =
    window.scrollY +
    document.getElementById(anchor)!.getBoundingClientRect().top -
    80;

  window.scrollTo({ top: targetTop, behavior: 'smooth' });
}
</script>

<style scoped lang="scss">
.q-item {
  height: 40px;
}
</style>
