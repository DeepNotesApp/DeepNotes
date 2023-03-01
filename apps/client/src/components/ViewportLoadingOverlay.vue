<template>
  <LoadingOverlay
    :frame-style="{
      height: `min(100%, calc(100vh - ${2 * uiStore().headerHeight}px))`,
    }"
  />
</template>
