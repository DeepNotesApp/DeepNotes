<template>
  <DeepBtn
    icon="mdi-menu"
    flat
    class="d-flex d-lg-none"
    style="font-size: 20px"
  >
    <q-menu
      anchor="bottom right"
      self="top right"
      auto-close
    >
      <q-list>
        <template v-if="!uiStore().loggedIn">
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
            <q-item-section>Account</q-item-section>
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

<script setup lang="ts">
import { logout } from 'src/code/auth/logout.client';
import { multiModePath } from 'src/code/utils.universal';
</script>
