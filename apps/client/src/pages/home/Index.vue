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
              visual note-taking tool with deep page navigation.
            </div>

            <Gap style="height: 30px" />

            <DeepBtn
              label="Get started - It's free!"
              color="primary"
              style="padding: 14px 25px; font-size: 15px"
              :to="{ name: 'register' }"
            />
          </div>
        </div>

        <div style="grid-area: image">
          <img
            style="width: 100%"
            src="~assets/screenshot.png"
          />
        </div>
      </div>

      <div class="collab-section">
        <div style="grid-area: image">
          <img
            style="width: 100%"
            src="~assets/screenshot.png"
          />
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
              Double-click to create a note and see the possibilities. Move,
              resize, expand, collapse, link, colorize. Use containers to create
              note hierarchies.
            </div>
          </div>
        </div>

        <div style="grid-area: image">
          <img
            style="width: 100%"
            src="~assets/screenshot.png"
          />
        </div>
      </div>

      <Gap style="height: 277px" />
    </ResponsiveContainer>

    <ViewportLoadingOverlay v-if="loading" />
  </q-page>
</template>

<script setup lang="ts">
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
