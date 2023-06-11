<template>
  <div class="display-btns">
    <DisplayNavigationBtns />

    <DisplayCameraBtns />
  </div>

  <DisplayMobileBtns />

  <DisplayMobileAltBtn />

  <DisplayUserAvatars />
</template>

<script setup lang="ts">
import DisplayCameraBtns from './DisplayCameraBtns.vue';
import DisplayMobileAltBtn from './DisplayMobileAltBtn.vue';
import DisplayMobileBtns from './DisplayMobileBtns.vue';
import DisplayNavigationBtns from './DisplayNavigationBtns.vue';
import DisplayUserAvatars from './DisplayUserAvatars.vue';
</script>

<style lang="scss" scoped>
.display-btns {
  position: absolute;

  top: 50px;
  left: 0;
  right: 0;

  pointer-events: none;

  @media (min-width: 840px) {
    top: 0px;
  }
}
</style>
