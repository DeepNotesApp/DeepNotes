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
            >
              Dive into your<br />note universe
            </div>

            <Gap style="height: 12px" />

            <div style="font-size: 15px; max-width: 283px">
              An open source,
              <span
                style="
                  text-transform: uppercase;
                  background-color: #309cff;
                  color: #101010;
                  font-weight: bold;
                  font-size: 11.3px;
                  border-radius: 8px;
                  padding: 1px 5px;
                "
                >end-to-end encrypted</span
              >
              infinite canvas with deep bidirectional page navigation and live
              collaboration.
            </div>

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
            >
              Collaborate in<br />real-time
            </div>

            <Gap style="height: 12px" />

            <div style="font-size: 15px; max-width: 369px">
              Collaborate with your team or work simultaneously from multiple
              devices. Password-protect your groups for an extra level of
              protection.
            </div>
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
            >
              Simple, yet<br />powerful notes
            </div>

            <Gap style="height: 12px" />

            <div style="font-size: 15px; max-width: 313px">
              Double-click to create a note and explore the possibilities. Move,
              resize, expand, collapse, link, colorize. Use containers to create
              note hierarchies.
            </div>
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

      <template v-if="!($q.platform.is.capacitor && $q.platform.is.ios)">
        <Gap style="height: 170px" />

        <PricingSection />
      </template>

      <div>
        <Gap style="height: 150px" />

        <div style="text-align: center; font-size: 42px; font-weight: bold">
          Applications
        </div>

        <Gap style="height: 40px" />

        <div class="row">
          <Thumbnail
            thumbnail-image="/applications/kanban-board-thumbnail.webp"
            title="Kanban board"
            href="https://deepnotes.app/pages/rUgBRksD5jyM6TDF_U_WN"
          />

          <Thumbnail
            thumbnail-image="/applications/history-study-thumbnail.webp"
            title="Study"
            href="https://deepnotes.app/pages/soL5nZWNv_elUnh78iVsN"
          />

          <Thumbnail
            thumbnail-image="/applications/diagram-thumbnail.webp"
            title="Diagram"
            href="https://deepnotes.app/pages/lZ0M_o6493_D2mqYe9AoY"
          />

          <Thumbnail
            thumbnail-image="/applications/link-gallery-thumbnail.webp"
            title="Link gallery"
            href="https://deepnotes.app/pages/KzH-9hRoZufmBUVwoRZ4u"
          />

          <Thumbnail
            thumbnail-image="/applications/family-tree-thumbnail.webp"
            title="Family tree"
            href="https://deepnotes.app/pages/5QyqYGXVzHF_10dNC4uux"
          />

          <Thumbnail
            thumbnail-image="/applications/flashcards-thumbnail.webp"
            title="Flashcards"
            href="https://deepnotes.app/pages/CPvCy_IjiRWqQNBj0cikY"
          />

          <Thumbnail
            thumbnail-image="/applications/database-structure-thumbnail.webp"
            title="Database diagram"
            href="https://deepnotes.app/pages/Gl8IxI7j9mKUsWyKHkv3V"
          />

          <Thumbnail
            thumbnail-image="/applications/cheat-sheet-thumbnail.webp"
            title="Cheat sheet"
            href="https://deepnotes.app/pages/nRea-8JgIXvbIyEi0ONCN"
          />
        </div>
      </div>

      <div>
        <Gap style="height: 150px" />

        <div style="text-align: center; font-size: 42px; font-weight: bold">
          Past Highlights
        </div>

        <Gap style="height: 40px" />

        <div class="row">
          <Thumbnail
            thumbnail-image="/highlights/reddit-logo.webp"
            :date="new Date('2023-07-18')"
            title="Our r/sideproject Reddit post"
            href="https://www.reddit.com/r/SideProject/comments/152zluu/i_developed_an_infinite_canvas_notetaking_tool/"
          >
            <div style="color: rgba(255, 255, 255, 0.7); font-size: 13px">
              <span>53 upvotes</span>

              <div style="display: inline-block; width: 8px"></div>

              <span>22 comments</span>
            </div>
          </Thumbnail>

          <Thumbnail
            thumbnail-image="/highlights/reddit-logo.webp"
            :date="new Date('2023-03-11')"
            title="Our r/webdev Reddit post"
            href="https://www.reddit.com/r/webdev/comments/11osv87/i_made_my_dream_notetaking_system/"
          >
            <div style="color: rgba(255, 255, 255, 0.7); font-size: 13px">
              <span>3.0k upvotes</span>

              <div style="display: inline-block; width: 8px"></div>

              <span>194 comments</span>
            </div>
          </Thumbnail>
        </div>
      </div>

      <template v-if="!authStore().loggedIn">
        <Gap style="height: 150px" />

        <div style="text-align: center">
          <DeepBtn
            label="Get started - It's free!"
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
</style>
