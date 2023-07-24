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
            color="primary"
            style="
              font-weight: bold;
              font-size: 21px;
              padding: 18px 28px;
              line-height: normal;
            "
            :href="`https://github.com/DeepNotesApp/DeepNotes/releases/download/v${version}/DeepNotes-${version}.AppImage`"
          >
            <div>
              <div>Download for Linux (AppImage)</div>

              <Gap style="height: 7px" />

              <div style="font-size: 16px">v{{ version }}</div>
            </div>
          </DeepBtn>

          <DeepBtn
            v-if="$q.platform.is.win"
            color="primary"
            style="
              font-weight: bold;
              font-size: 21px;
              padding: 18px 28px;
              line-height: normal;
            "
            href="https://apps.microsoft.com/store/detail/deepnotes/9PH76W3HPQZJ"
            target="_blank"
          >
            <div>
              <div>Go to Microsoft Store</div>

              <Gap style="height: 7px" />

              <div style="font-size: 16px">v{{ version }}</div>
            </div>
          </DeepBtn>

          <DeepBtn
            v-if="$q.platform.is.mac"
            color="primary"
            style="
              font-weight: bold;
              font-size: 21px;
              padding: 18px 28px;
              line-height: normal;
            "
            :href="`https://github.com/DeepNotesApp/DeepNotes/releases/download/v${version}/DeepNotes-${version}.dmg`"
          >
            <div>
              <div>Download for MacOS (DMG)</div>

              <Gap style="height: 7px" />

              <div style="font-size: 16px">v{{ version }}</div>
            </div>
          </DeepBtn>

          <DeepBtn
            v-if="$q.platform.is.android"
            label="Go to the Play Store"
            color="primary"
            style="
              font-weight: bold;
              font-size: 21px;
              padding: 18px 28px;
              line-height: normal;
            "
            href="https://play.google.com/store/apps/details?id=app.deepnotes"
            target="_blank"
          />

          <DeepBtn
            v-if="$q.platform.is.ios"
            label="Go to the App Store"
            color="primary"
            style="
              font-weight: bold;
              font-size: 21px;
              padding: 18px 28px;
              line-height: normal;
            "
            href="https://apps.apple.com/us/app/deepnotes-visual-note-taking/id6450611344"
            target="_blank"
          />
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
          url="https://apps.microsoft.com/store/detail/deepnotes/9PH76W3HPQZJ"
        >
          <img
            src="~assets/platforms/windows.webp"
            :style="{ width: '88px' }"
          />
        </PlatformCard>

        <PlatformCard
          :url="`https://github.com/DeepNotesApp/DeepNotes/releases/download/v${version}/DeepNotes-${version}.dmg`"
        >
          <img
            src="~assets/platforms/mac.webp"
            style="margin-top: -12px; width: 102px"
          />
        </PlatformCard>

        <PlatformCard
          :url="`https://github.com/DeepNotesApp/DeepNotes/releases/download/v${version}/DeepNotes-${version}.AppImage`"
        >
          <img
            src="~assets/platforms/linux.webp"
            style="margin-top: 4px; width: 92px"
          />
        </PlatformCard>
      </div>

      <div style="display: flex; justify-content: center; flex-wrap: wrap">
        <div>
          <a
            href="https://apps.apple.com/us/app/deepnotes-visual-note-taking/id6450611344"
            target="_blank"
          >
            <img
              src="~assets/badges/app-store.svg"
              style="
                margin: 36px;
                margin-top: 24px;
                margin-bottom: 0;
                height: 56px;
              "
            />
          </a>
        </div>

        <div>
          <a
            href="https://play.google.com/store/apps/details?id=app.deepnotes"
            target="_blank"
          >
            <img
              src="~assets/badges/google-play.webp"
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
          style="padding: 10px 20px; font-size: 15px"
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

const version = '1.0.4';

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
