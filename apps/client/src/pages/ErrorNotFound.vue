<template>
  <div
    class="fullscreen bg-blue text-white text-center q-pa-md flex flex-center"
  >
    <div>
      <div style="font-size: 30vh">404</div>

      <div
        class="text-h2"
        style="opacity: 0.4"
      >
        Oops. Nothing here...
      </div>

      <DeepBtn
        class="q-mt-xl"
        color="white"
        text-color="blue"
        unelevated
        :to="{ name: 'home' }"
        label="Go Home"
        no-caps
      />
    </div>
  </div>
</template>

<script lang="ts">
export default defineComponent({
  name: 'ErrorNotFound',
});
</script>
