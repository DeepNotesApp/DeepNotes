<template>
  <template v-if="!uiStore().loggedIn && uiStore().width < BREAKPOINT_LG_MIN">
    <div style="width: 16px"></div>

    <DeepBtn
      icon="mdi-menu"
      flat
      style="padding: 4px 12px; font-size: 20px"
    >
      <q-menu
        anchor="bottom right"
        self="top right"
        auto-close
      >
        <q-list>
          <template
            v-if="!uiStore().loggedIn && uiStore().width < BREAKPOINT_MD_MIN"
          >
            <q-item
              clickable
              :to="{ name: 'login' }"
              style="padding: 16px 20px; font-size: 16px"
            >
              <q-item-section avatar>
                <q-icon name="mdi-login" />
              </q-item-section>
              <q-item-section>Login</q-item-section>
            </q-item>

            <q-item
              clickable
              :to="{ name: 'register' }"
              style="padding: 16px 20px; font-size: 16px"
            >
              <q-item-section avatar>
                <q-icon name="mdi-account-plus" />
              </q-item-section>
              <q-item-section>Sign Up</q-item-section>
            </q-item>
          </template>

          <template v-if="uiStore().loggedIn">
            <q-item
              v-if="uiStore().width < BREAKPOINT_MD_MIN"
              clickable
              :href="multiModePath('/pages')"
              style="padding: 16px 20px; font-size: 16px"
            >
              <q-item-section avatar>
                <q-icon name="mdi-note-multiple" />
              </q-item-section>
              <q-item-section>Go to pages</q-item-section>
            </q-item>

            <q-item
              clickable
              :to="{ name: 'account/general' }"
              style="padding: 16px 20px; font-size: 16px"
            >
              <q-item-section avatar>
                <q-icon name="mdi-account" />
              </q-item-section>
              <q-item-section>Account settings</q-item-section>
            </q-item>
          </template>

          <q-item
            clickable
            :to="{ name: 'pricing' }"
            style="padding: 16px 20px; font-size: 16px"
          >
            <q-item-section avatar>
              <q-icon name="mdi-currency-usd" />
            </q-item-section>
            <q-item-section>Pricing</q-item-section>
          </q-item>

          <q-item
            clickable
            :to="{ name: 'download' }"
            style="padding: 16px 20px; font-size: 16px"
          >
            <q-item-section avatar>
              <q-icon name="mdi-download" />
            </q-item-section>
            <q-item-section>Download</q-item-section>
          </q-item>

          <q-item
            clickable
            :to="{ name: 'whitepaper' }"
            style="padding: 16px 20px; font-size: 16px"
          >
            <q-item-section avatar>
              <q-icon name="mdi-file-document" />
            </q-item-section>
            <q-item-section>Whitepaper</q-item-section>
          </q-item>

          <template v-if="uiStore().loggedIn">
            <q-item
              clickable
              @click="logout()"
              style="padding: 16px 20px; font-size: 16px"
            >
              <q-item-section avatar>
                <q-icon name="mdi-logout" />
              </q-item-section>
              <q-item-section>Logout</q-item-section>
            </q-item>
          </template>
        </q-list>
      </q-menu>
    </DeepBtn>
  </template>
</template>

<script setup lang="ts">
import { BREAKPOINT_LG_MIN, BREAKPOINT_MD_MIN } from '@stdlib/misc';
import { logout } from 'src/code/auth/logout.client';
import { multiModePath } from 'src/code/utils.universal';
</script>
