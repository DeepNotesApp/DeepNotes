<template>
  <router-view></router-view>

  <LoadingOverlay v-if="appStore().loading" />
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core';

useMeta(() => ({
  title: 'DeepNotes - The next level of note-taking',
}));

onMounted(() => {
  appStore().loading = false;
});

// Prevent touchpad pinch-to-zoom

useEventListener(
  globalThis.window,
  'wheel',
  (event) => {
    let isTouchpad = false;

    if ((event as any).wheelDeltaY) {
      if (Math.abs((event as any).wheelDeltaY) !== 120) {
        isTouchpad = true;
      }
    } else if (event.deltaMode === 0) {
      isTouchpad = true;
    }

    if (!isTouchpad) {
      return;
    }

    if (event.ctrlKey) {
      event.preventDefault();
    }
  },
  { passive: false },
);

// Sync auth and UI stores

watchPostEffect(() => (uiStore().loggedIn = authStore().loggedIn));

// Resize listener

const onWindowResize = () => {
  uiStore().width = window.innerWidth;
  uiStore().height = window.innerHeight;
};

onMounted(onWindowResize);

useEventListener(globalThis.window, 'resize', onWindowResize);
</script>

<style>
* {
  font-family: Inter, sans-serif;

  box-sizing: border-box;

  box-shadow: none !important;
}
*::before {
  box-shadow: none !important;
}
*::after {
  box-shadow: none !important;
}

body {
  color: rgba(255, 255, 255, 0.9) !important;
}

code *,
kbd *,
pre *,
samp * {
  font-family: monospace;
}

html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.q-page {
  min-height: initial;
  isolation: isolate;
}

h1,
h2,
h3 {
  line-height: unset;
  letter-spacing: unset;
  font-weight: bold;
}
h1 {
  font-size: 2.5em;
}
h2 {
  font-size: 1.75em;
}
h3 {
  font-size: 1.25em;
}

.q-dark {
  color: inherit;
}

.text-white {
  color: inherit !important;
}

.q-tooltip {
  font-size: 12px;
}

.q-notifications__list {
  z-index: 2147483647;
}
.q-notification {
  z-index: 2147483647;
}

.disabled,
.disabled *,
[disabled],
[disabled] *,
.q-field--disabled * {
  cursor: auto !important;
}

.q-separator {
  background-color: rgba(255, 255, 255, 0.2) !important;
}

.q-layout__section--marginal {
  color: inherit;
}

/* Lists */

.q-list {
  user-select: none;
}

.q-list--dark,
.q-item--dark {
  color: rgba(255, 255, 255, 0.9);
}

.q-item__section--side {
  min-width: 0px;
}

/* Scrollbars */

::-webkit-scrollbar {
  width: 15px;
}
::-webkit-scrollbar-track {
  background: #202020;
}
::-webkit-scrollbar-thumb {
  background: #303030;
  border: solid 1px #404040;
}
::-webkit-scrollbar-thumb:hover {
  background: #404040;
}
</style>
