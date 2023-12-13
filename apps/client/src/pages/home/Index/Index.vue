<template>
  <q-page>
    <ResponsiveContainer>
      <div class="main-section">
        <div style="grid-area: text; display: grid; place-items: center">
          <div
            style="display: flex; flex-direction: column; align-items: center"
          >
            <div
              style="
                font-weight: bold;
                font-size: 46px;
                line-height: 1.2em;
                text-align: center;
              "
              v-html="$t('homeSection1Title')"
            ></div>

            <Gap style="height: 12px" />

            <div
              style="font-size: 15px; max-width: 283px"
              v-html="$t('homeSection1Body')"
            ></div>

            <template v-if="!authStore().loggedIn">
              <Gap style="height: 30px" />

              <DeepBtn
                label="Get started for free"
                color="primary"
                style="padding: 14px 25px; font-size: 15.5px; font-weight: bold"
                :to="{ name: 'register' }"
              />
            </template>
          </div>
        </div>

        <div style="grid-area: image">
          <video
            style="width: 100%; image-rendering: pixelated"
            autoplay
            muted
            loop
            playsinline
          >
            <source
              src="~assets/main.mp4"
              type="video/mp4"
            />
          </video>
        </div>
      </div>

      <div class="collab-section">
        <div style="grid-area: image">
          <video
            style="width: 100%; image-rendering: pixelated"
            autoplay
            muted
            loop
            playsinline
          >
            <source
              src="~assets/collab.mp4"
              type="video/mp4"
            />
          </video>
        </div>

        <div style="grid-area: text; display: grid; place-items: center">
          <div
            style="display: flex; flex-direction: column; align-items: center"
          >
            <div
              style="
                font-weight: bold;
                font-size: 44px;
                line-height: 1.2em;
                text-align: center;
              "
              v-html="$t('homeSection2Title')"
            ></div>

            <Gap style="height: 12px" />

            <div
              style="font-size: 15px; max-width: 369px"
              v-html="$t('homeSection2Body')"
            ></div>
          </div>
        </div>
      </div>

      <div class="notes-section">
        <div style="grid-area: text; display: grid; place-items: center">
          <div
            style="display: flex; flex-direction: column; align-items: center"
          >
            <div
              style="
                font-weight: bold;
                font-size: 44px;
                line-height: 1.2em;
                text-align: center;
              "
              v-html="$t('homeSection3Title')"
            ></div>

            <Gap style="height: 12px" />

            <div
              style="font-size: 15px; max-width: 300px"
              v-html="$t('homeSection3Body')"
            ></div>
          </div>
        </div>

        <div style="grid-area: image">
          <video
            style="width: 100%; image-rendering: pixelated"
            autoplay
            muted
            loop
            playsinline
          >
            <source
              src="~assets/notes.mp4"
              type="video/mp4"
            />
          </video>
        </div>
      </div>

      <Gap style="height: 170px" />

      <div style="display: flex; justify-content: center">
        <BillingFrequencyToggle v-model="billingFrequency" />
      </div>

      <Gap style="height: 48px" />

      <PricingSection :billing-frequency="billingFrequency" />

      <div>
        <Gap style="height: 150px" />

        <div style="text-align: center; font-size: 42px; font-weight: bold">
          {{ $t('useCases') }}
        </div>

        <Gap style="height: 40px" />

        <div class="row">
          <Thumbnail
            thumbnail-image="/applications/mind-map.webp"
            :title="$t('mindMaps')"
            href="https://deepnotes.app/pages/cMwNNxpa2jZKuP_0zzrMP"
          />

          <Thumbnail
            thumbnail-image="/applications/diagram-thumbnail.webp"
            :title="$t('diagrams')"
            href="https://deepnotes.app/pages/lZ0M_o6493_D2mqYe9AoY"
          />

          <Thumbnail
            thumbnail-image="/applications/kanban-board-thumbnail.webp"
            :title="$t('kanbanBoards')"
            href="https://deepnotes.app/pages/rUgBRksD5jyM6TDF_U_WN"
          />

          <Thumbnail
            thumbnail-image="/applications/database-structure-thumbnail.webp"
            :title="$t('databaseDiagrams')"
            href="https://deepnotes.app/pages/Gl8IxI7j9mKUsWyKHkv3V"
          />

          <Thumbnail
            thumbnail-image="/applications/family-tree-thumbnail.webp"
            :title="$t('familyTrees')"
            href="https://deepnotes.app/pages/5QyqYGXVzHF_10dNC4uux"
          />

          <Thumbnail
            thumbnail-image="/applications/flashcards-thumbnail.webp"
            :title="$t('flashcards')"
            href="https://deepnotes.app/pages/CPvCy_IjiRWqQNBj0cikY"
          />

          <Thumbnail
            thumbnail-image="/applications/cheat-sheet-thumbnail.webp"
            :title="$t('cheatSheets')"
            href="https://deepnotes.app/pages/nRea-8JgIXvbIyEi0ONCN"
          />

          <Thumbnail
            thumbnail-image="/applications/history-study-thumbnail.webp"
            :title="$t('studies')"
            href="https://deepnotes.app/pages/soL5nZWNv_elUnh78iVsN"
          />
        </div>
      </div>

      <template v-if="!authStore().loggedIn">
        <Gap style="height: 150px" />

        <div style="text-align: center">
          <DeepBtn
            :label="$t('getStartedItsFree')"
            color="primary"
            style="padding: 15px 25px; font-size: 16.5px; font-weight: bold"
            :to="{ name: 'register' }"
          />
        </div>
      </template>

      <Gap style="height: 190px" />
    </ResponsiveContainer>

    <ViewportLoadingOverlay v-if="loading" />
  </q-page>
</template>

<script setup lang="ts">
import PricingSection from './PricingSection.vue';
import Thumbnail from './Thumbnail.vue';

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

const billingFrequency = ref<'monthly' | 'yearly'>('monthly');
</script>

<style lang="scss">
.main-section {
  margin-top: 150px;

  display: grid;
  gap: 83px;
  grid-template-areas: 'text' 'image';
  grid-template-rows: auto 1fr;
  align-items: center;

  @media (min-width: $breakpoint-lg-min) {
    margin-top: 140px;

    grid-template-areas: 'text image';
    grid-template-columns: 312px 1fr;
    grid-template-rows: auto;
    gap: 46px;
  }
}

.collab-section {
  margin-top: 160px;

  display: grid;
  grid-template-areas: 'text' 'image';
  grid-template-rows: auto 1fr;
  gap: 61px;
  align-items: center;

  @media (min-width: $breakpoint-lg-min) {
    grid-template-areas: 'image text';
    grid-template-columns: 1fr 367px;
    grid-template-rows: auto;
    gap: 48px;
  }
}

.notes-section {
  margin-top: 160px;

  display: grid;
  grid-template-areas: 'text' 'image';
  grid-template-rows: auto 1fr;
  gap: 56px;
  align-items: center;

  @media (min-width: $breakpoint-lg-min) {
    grid-template-areas: 'text image';
    grid-template-columns: 356px 1fr;
    grid-template-rows: auto;
    gap: 32px;
  }
}

.pill {
  text-transform: uppercase;
  background-color: #309cff;
  color: #101010;
  font-weight: bold;
  font-size: 11.3px;
  border-radius: 8px;
  padding: 1px 5px;
}
</style>
