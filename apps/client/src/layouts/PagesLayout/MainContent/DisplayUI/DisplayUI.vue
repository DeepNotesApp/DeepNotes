<template>
  <div class="display-btns">
    <DisplayHorizontalPath />

    <DisplayLeftBtns />
    <DisplayRightBtns />

    <DisplayFindAndReplace />
  </div>

  <DisplayTopBtns />

  <DisplayMobileAltBtn />
  <DisplayUserAvatars />
  <DisplaySelectionCount />
</template>

<script setup lang="ts">
import DisplayFindAndReplace from './DisplayFindAndReplace.vue';
import DisplayHorizontalPath from './DisplayHorizontalPath.vue';
import DisplayLeftBtns from './DisplayLeftBtns.vue';
import DisplayMobileAltBtn from './DisplayMobileAltBtn.vue';
import DisplayRightBtns from './DisplayRightBtns.vue';
import DisplaySelectionCount from './DisplaySelectionCount.vue';
import DisplayTopBtns from './DisplayTopBtns.vue';
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
