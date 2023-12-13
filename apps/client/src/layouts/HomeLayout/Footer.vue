<template>
  <q-footer
    style="
      background-color: #202020;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
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
          <div class="footer-header">{{ $t('product') }}</div>

          <router-link
            :to="{ name: 'pricing' }"
            class="footer-item"
          >
            {{ $t('pricing') }}
          </router-link>

          <router-link
            v-if="isIncluded(quasarMode, ['ssr', 'spa'])"
            :to="{ name: 'download' }"
            class="footer-item"
          >
            {{ $t('download') }}
          </router-link>

          <router-link
            :to="{ name: 'whitepaper' }"
            class="footer-item"
          >
            {{ $t('whitepaper') }}
          </router-link>

          <router-link
            :to="{ name: 'help' }"
            class="footer-item"
          >
            {{ $t('help') }}
          </router-link>
        </div>

        <div class="footer-section col-4 col-md-3">
          <div class="footer-header">
            {{ $t('socials') }}
          </div>

          <a
            class="footer-item"
            href="https://discord.gg/UaF2gPTUPh"
          >
            Discord
          </a>

          <a
            class="footer-item"
            href="https://www.reddit.com/r/DeepNotesApp/"
          >
            Reddit
          </a>

          <a
            class="footer-item"
            href="https://github.com/DeepNotesApp/DeepNotes"
          >
            GitHub
          </a>
        </div>

        <div class="footer-section col-4 col-md-3">
          <div class="footer-header">{{ $t('legal') }}</div>

          <router-link
            :to="{ name: 'privacy-policy' }"
            class="footer-item"
          >
            {{ $t('privacyPolicy') }}
          </router-link>

          <router-link
            :to="{ name: 'terms-of-service' }"
            class="footer-item"
          >
            {{ $t('termsOfService') }}
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
