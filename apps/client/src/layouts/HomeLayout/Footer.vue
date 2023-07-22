<template>
  <q-footer
    style="
      background-color: #202020;
      border-top: 1px solid rgba(255, 255, 255, 0.18);
    "
  >
    <ResponsiveContainer>
      <Gap style="height: 64px" />

      <div class="row">
        <div
          class="footer-section col-12 col-md-3"
          style="margin-top: -2px"
        >
          <router-link :to="{ name: 'home' }">
            <div
              class="footer-header"
              style="display: flex; align-items: center"
            >
              <img
                src="~assets/white-logo-outline.webp"
                style="
                  margin-top: -2px;
                  width: 28px;
                  height: 28px;
                  opacity: 95%;
                "
              />

              <Gap style="width: 4px" />

              <div style="color: rgba(255, 255, 255, 0.9); font-size: 17px">
                DeepNotes
              </div>
            </div>
          </router-link>
        </div>

        <div class="footer-section col-4 col-md-3">
          <div class="footer-header">Product</div>

          <router-link
            v-if="!($q.platform.is.capacitor && $q.platform.is.ios)"
            :to="{ name: 'pricing' }"
            class="footer-item"
          >
            Pricing
          </router-link>

          <router-link
            v-if="isIncluded(quasarMode, ['ssr', 'spa'])"
            :to="{ name: 'download' }"
            class="footer-item"
          >
            Download
          </router-link>

          <router-link
            :to="{ name: 'whitepaper' }"
            class="footer-item"
          >
            Whitepaper
          </router-link>
        </div>

        <div class="footer-section col-4 col-md-3">
          <div class="footer-header">Socials</div>

          <a
            class="footer-item"
            href="https://discord.gg/UaF2gPTUPh"
          >
            Discord
          </a>

          <a
            class="footer-item"
            href="https://twitter.com/DeepNotesApp"
          >
            Twitter
          </a>

          <a
            class="footer-item"
            href="https://www.reddit.com/r/DeepNotesApp/"
          >
            Reddit
          </a>

          <a
            class="footer-item"
            href="https://www.linkedin.com/company/deepnotes"
          >
            LinkedIn
          </a>

          <a
            class="footer-item"
            href="https://github.com/DeepNotesApp/DeepNotes"
          >
            GitHub
          </a>
        </div>

        <div class="footer-section col-4 col-md-3">
          <div class="footer-header">Legal</div>

          <router-link
            :to="{ name: 'privacy-policy' }"
            class="footer-item"
          >
            Privacy policy
          </router-link>

          <router-link
            :to="{ name: 'terms-of-service' }"
            class="footer-item"
          >
            Terms of service
          </router-link>
        </div>
      </div>

      <Gap style="height: 100px" />

      <q-separator />

      <Gap style="height: 20px" />

      <div style="font-size: 13px; text-align: center">
        @ {{ new Date().getFullYear() }} DeepNotes |
        <a href="mailto:contact@deepnotes.app">contact@deepnotes.app</a>
      </div>

      <Gap style="height: 20px" />
    </ResponsiveContainer>
  </q-footer>
</template>

<script setup lang="ts">
import { isIncluded } from '@stdlib/misc';

const quasarMode = process.env.MODE;
</script>

<style scoped>
.footer-section {
  margin-bottom: 48px;
}
.footer-header {
  font-weight: bold;
  font-size: 15px;
}
.footer-item {
  display: block;

  margin-top: 6px;

  color: #c8c8c8 !important;
}
.footer-item:hover {
  color: #ffffff !important;
}
</style>
