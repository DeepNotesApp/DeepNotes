<template>
  <q-layout
    class="home-layout"
    view="hHh Lpr fff"
  >
    <Header></Header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <Footer></Footer>
  </q-layout>
</template>

<script setup lang="ts">
import Footer from './Footer.vue';
import Header from './Header/Header.vue';
</script>

<style>
body {
  background-color: #181818 !important;
}
</style>

<style scoped lang="scss">
.home-layout {
  :deep() {
    a:not(.q-hoverable) {
      text-decoration: none;

      color: #47a7ff;

      cursor: pointer;

      &:hover {
        color: #4fc3f7;
      }
    }

    .toolbar-btn {
      height: 46px;

      font-size: 15px;
      font-weight: normal;
      text-transform: none;
    }
  }
}
</style>
