<template>
  <q-page>
    <ResponsiveContainer>
      <Gap style="height: 150px" />

      <template
        v-if="
          $q.platform.is.linux ||
          $q.platform.is.win ||
          $q.platform.is.mac ||
          $q.platform.is.android ||
          $q.platform.is.ios
        "
      >
        <div style="font-size: 45px; font-weight: bold; text-align: center">
          Download
        </div>

        <Gap style="height: 50px" />

        <div
          class="row"
          style="justify-content: center"
        >
          <DeepBtn
            v-if="$q.platform.is.linux"
            label="Download for Linux (AppImage)"
            color="primary"
            style="font-weight: bold; font-size: 21px; padding: 16px 30px"
            href="https://github.com/DeepNotesApp/DeepNotes/releases/download/v0.0.1/DeepNotes-0.0.1.AppImage"
          />

          <DeepBtn
            v-if="$q.platform.is.win"
            label="Download for Windows (NSIS)"
            color="primary"
            style="font-weight: bold; font-size: 21px; padding: 16px 30px"
            href="https://github.com/DeepNotesApp/DeepNotes/releases/download/v0.0.1/DeepNotes-Setup-0.0.1.exe"
          />

          <DeepBtn
            v-if="$q.platform.is.mac"
            label="Download for MacOS (DMG)"
            color="primary"
            style="font-weight: bold; font-size: 21px; padding: 16px 30px"
            disable
          >
            <q-tooltip
              anchor="bottom middle"
              self="top middle"
              transition-show="jump-down"
              transition-hide="jump-up"
            >
              Coming soon
            </q-tooltip>
          </DeepBtn>

          <DeepBtn
            v-if="$q.platform.is.android"
            label="Go to the Play Store"
            color="primary"
            style="font-weight: bold; font-size: 21px; padding: 16px 30px"
            href="https://play.google.com/store/apps/details?id=app.deepnotes"
          />

          <DeepBtn
            v-if="$q.platform.is.ios"
            label="Go to the App Store"
            color="primary"
            style="font-weight: bold; font-size: 21px; padding: 16px 30px"
          >
            <q-tooltip
              anchor="bottom middle"
              self="top middle"
              transition-show="jump-down"
              transition-hide="jump-up"
            >
              Coming soon
            </q-tooltip>
          </DeepBtn>
        </div>

        <Gap style="height: 140px" />
      </template>

      <div style="font-size: 45px; font-weight: bold; text-align: center">
        All downloads
      </div>

      <Gap style="height: 56px" />

      <div
        class="row"
        style="justify-content: center"
      >
        <PlatformCard
          url="https://github.com/DeepNotesApp/DeepNotes/releases/download/v0.0.1/DeepNotes-Setup-0.0.1.exe"
        >
          <template #image>
            <img
              src="~assets/platforms/windows.png"
              :style="{ width: '88px' }"
            />
          </template>
        </PlatformCard>

        <PlatformCard disable>
          <template #image>
            <img
              src="~assets/platforms/mac.png"
              style="margin-top: -12px; width: 102px"
            />
          </template>

          <template #button>
            <DeepBtn
              label="Download"
              color="primary"
              style="width: 150px"
              disable
            >
              <q-tooltip
                anchor="bottom middle"
                self="top middle"
                transition-show="jump-down"
                transition-hide="jump-up"
              >
                Coming soon
              </q-tooltip>
            </DeepBtn>
          </template>
        </PlatformCard>

        <PlatformCard
          url="https://github.com/DeepNotesApp/DeepNotes/releases/download/v0.0.1/DeepNotes-0.0.1.AppImage"
        >
          <template #image>
            <img
              src="~assets/platforms/linux.png"
              style="margin-top: 4px; width: 92px"
            />
          </template>
        </PlatformCard>
      </div>

      <div style="display: flex; justify-content: center; flex-wrap: wrap">
        <img
          src="~assets/badges/app-store.svg"
          style="
            margin: 36px;
            margin-top: 24px;
            margin-bottom: 0;
            height: 56px;
            opacity: 0.5;
          "
        />

        <div>
          <a
            href="https://play.google.com/store/apps/details?id=app.deepnotes"
            target="_blank"
          >
            <img
              src="~assets/badges/google-play.png"
              style="
                margin: 36px;
                margin-top: 24px;
                margin-bottom: 0;
                height: 56px;
              "
            />
          </a>
        </div>
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

      <Gap style="height: 180px" />
    </ResponsiveContainer>

    <ViewportLoadingOverlay v-if="loading" />
  </q-page>
</template>

<script setup lang="ts">
import { multiModePath } from 'src/code/utils/misc';

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
