<template>
  <q-page>
    <ResponsiveContainer>
      <Gap style="height: 96px" />

      <div style="font-size: 45px; font-weight: bold; text-align: center">
        Downloads
      </div>

      <Gap style="height: 56px" />

      <div
        class="row"
        style="justify-content: center"
      >
        <PlatformCard
          :options="[
            { name: '32 bits', url: '' },
            { name: '64 bits', url: '' },
          ]"
        >
          <img
            src="~assets/platforms/windows.png"
            :style="{ width: '88px' }"
          />
        </PlatformCard>

        <PlatformCard>
          <img
            src="~assets/platforms/mac.png"
            style="margin-top: -12px; width: 102px"
          />
        </PlatformCard>

        <PlatformCard>
          <img
            src="~assets/platforms/linux.png"
            style="margin-top: 4px; width: 92px"
          />
        </PlatformCard>
      </div>

      <div style="display: flex; justify-content: center; flex-wrap: wrap">
        <img
          src="~assets/badges/app-store.svg"
          style="margin: 36px; margin-top: 24px; margin-bottom: 0; height: 56px"
        />

        <img
          src="~assets/badges/google-play.png"
          style="margin: 36px; margin-top: 24px; margin-bottom: 0; height: 56px"
        />
      </div>

      <Gap style="height: 64px" />

      <div style="display: flex; justify-content: center">
        <DeepBtn
          label="Use web version"
          color="secondary"
          :href="multiModePath('/pages')"
          style="padding: 10px 20px"
        />
      </div>

      <Gap style="height: 152px" />
    </ResponsiveContainer>

    <ViewportLoadingOverlay v-if="loading" />
  </q-page>
</template>

<script setup lang="ts">
import { multiModePath } from 'src/code/utils.universal';

import PlatformCard from './PlatformCard.vue';

const loading = ref(true);

onMounted(async () => {
  const images = document.querySelectorAll('img');

  await Promise.all(
    Array.from(images).map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete && image.naturalHeight !== 0) {
            resolve();
          } else {
            image.addEventListener('load', () => resolve());
          }
        }),
    ),
  );

  loading.value = false;
});
</script>
