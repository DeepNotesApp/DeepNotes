<template>
  <div class="display-navigation-btns">
    <DisplayBtn
      icon="mdi-arrow-up"
      size="12px"
      :btn-size="30"
      :disable="
        internals.pages.react.pageId === internals.pages.react.pathPageIds[0]
      "
      @click="goBackward()"
    >
      <q-tooltip
        anchor="center right"
        self="center left"
        transition-show="jump-right"
        transition-hide="jump-left"
      >
        Go backward
      </q-tooltip>
    </DisplayBtn>

    <Gap style="height: 6px" />

    <DisplayBtn
      icon="mdi-arrow-down"
      size="12px"
      :btn-size="30"
      :disable="
        internals.pages.react.pageId ===
        internals.pages.react.pathPageIds.at(-1)
      "
      @click="goForward()"
    >
      <q-tooltip
        anchor="center right"
        self="center left"
        transition-show="jump-right"
        transition-hide="jump-left"
      >
        Go forward
      </q-tooltip>
    </DisplayBtn>
  </div>
</template>

<script setup lang="ts">
async function goBackward() {
  await internals.pages.goToPage(
    internals.pages.react.pathPageIds[
      internals.pages.react.pathPageIds.indexOf(internals.pages.react.pageId!) -
        1
    ],
  );
}

async function goForward() {
  await internals.pages.goToPage(
    internals.pages.react.pathPageIds[
      internals.pages.react.pathPageIds.indexOf(internals.pages.react.pageId!) +
        1
    ],
  );
}
</script>

<style lang="scss" scoped>
.display-navigation-btns {
  position: absolute;

  left: 12px;
  top: 32px;

  display: flex;
  flex-direction: column;
}
</style>
