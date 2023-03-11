<template>
  <q-item
    clickable
    dense
    style="font-weight: bold; font-size: 18px"
    @click="scrollToAnchor('legal-entity-status')"
  >
    <q-item-section>Legal Entity Status</q-item-section>
  </q-item>

  <q-item
    clickable
    dense
    style="font-weight: bold; font-size: 18px"
    @click="scrollToAnchor('user-responsibility')"
  >
    <q-item-section>User Responsibility</q-item-section>
  </q-item>

  <q-item
    clickable
    dense
    style="font-weight: bold; font-size: 18px"
    @click="scrollToAnchor('acceptable-use')"
  >
    <q-item-section>Acceptable use</q-item-section>
  </q-item>

  <q-item
    clickable
    dense
    style="font-weight: bold; font-size: 18px"
    @click="scrollToAnchor('account-suspension')"
  >
    <q-item-section>Account suspension</q-item-section>
  </q-item>

  <q-item
    clickable
    dense
    style="font-weight: bold; font-size: 18px"
    @click="scrollToAnchor('limitation-of-liability')"
  >
    <q-item-section>Limitation of liability</q-item-section>
  </q-item>

  <q-item
    clickable
    dense
    style="font-weight: bold; font-size: 18px"
    @click="scrollToAnchor('contact-information')"
  >
    <q-item-section>Contact information</q-item-section>
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
