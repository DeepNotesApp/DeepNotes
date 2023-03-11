<template>
  <q-item
    clickable
    dense
    style="font-weight: bold; font-size: 18px"
    @click="scrollToAnchor('data-collection')"
  >
    <q-item-section> Data collection </q-item-section>
  </q-item>

  <q-item
    clickable
    dense
    style="font-weight: bold; font-size: 18px"
    @click="scrollToAnchor('data-protection')"
  >
    <q-item-section> Data protection </q-item-section>
  </q-item>

  <q-item
    clickable
    dense
    style="font-weight: bold; font-size: 18px"
    @click="scrollToAnchor('data-storage')"
  >
    <q-item-section> Data storage </q-item-section>
  </q-item>

  <q-item
    clickable
    dense
    style="font-weight: bold; font-size: 18px"
    @click="scrollToAnchor('data-processing')"
  >
    <q-item-section> Data processing </q-item-section>
  </q-item>

  <q-item
    clickable
    dense
    style="font-weight: bold; font-size: 18px"
    @click="scrollToAnchor('cookies')"
  >
    <q-item-section> Cookies </q-item-section>
  </q-item>

  <q-item
    clickable
    dense
    style="font-weight: bold; font-size: 18px"
    @click="scrollToAnchor('user-rights')"
  >
    <q-item-section> User rights </q-item-section>
  </q-item>

  <q-item
    clickable
    dense
    style="font-weight: bold; font-size: 18px"
    @click="scrollToAnchor('contact')"
  >
    <q-item-section> Contact </q-item-section>
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
