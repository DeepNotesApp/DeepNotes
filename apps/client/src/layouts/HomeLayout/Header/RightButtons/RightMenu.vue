<template>
  <template v-if="uiStore().loggedIn || uiStore().width < BREAKPOINT_LG_MIN">
    <Gap style="width: 20px" />

    <ToolbarBtn
      :icon="uiStore().loggedIn ? 'mdi-account-circle' : 'mdi-menu'"
      :icon-size="uiStore().loggedIn ? '38px' : '32px'"
      :btn-size="uiStore().loggedIn ? '36px' : '46px'"
      :round="uiStore().loggedIn"
    >
      <q-menu
        anchor="bottom right"
        self="top right"
        auto-close
      >
        <q-list>
          <template v-if="uiStore().loggedIn">
            <q-item>
              <q-item-section style="font-weight: bold">
                <q-item-label>
                  {{ selfUserName().get() }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-separator />
          </template>

          <template
            v-if="!uiStore().loggedIn && uiStore().width < BREAKPOINT_MD_MIN"
          >
            <q-item
              clickable
              :to="{ name: 'login' }"
            >
              <q-item-section avatar>
                <q-icon name="mdi-login" />
              </q-item-section>
              <q-item-section>Login</q-item-section>
            </q-item>

            <q-item
              clickable
              :to="{ name: 'register' }"
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
              :to="{ name: 'account/general' }"
            >
              <q-item-section avatar>
                <q-icon name="mdi-account" />
              </q-item-section>
              <q-item-section>Account settings</q-item-section>
            </q-item>
          </template>

          <template v-if="uiStore().width < BREAKPOINT_LG_MIN">
            <q-item
              clickable
              :to="{ name: 'pricing' }"
            >
              <q-item-section avatar>
                <q-icon name="mdi-currency-usd" />
              </q-item-section>
              <q-item-section>Pricing</q-item-section>
            </q-item>

            <q-item
              v-if="isIncluded(quasarMode, ['ssr', 'spa'])"
              clickable
              :to="{ name: 'download' }"
            >
              <q-item-section avatar>
                <q-icon name="mdi-download" />
              </q-item-section>
              <q-item-section>Download</q-item-section>
            </q-item>

            <q-item
              clickable
              :to="{ name: 'whitepaper' }"
            >
              <q-item-section avatar>
                <q-icon name="mdi-file-document" />
              </q-item-section>
              <q-item-section>Whitepaper</q-item-section>
            </q-item>

            <q-item
              clickable
              :to="{ name: 'help' }"
            >
              <q-item-section avatar>
                <q-icon name="mdi-help" />
              </q-item-section>
              <q-item-section>Help</q-item-section>
            </q-item>
          </template>

          <template v-if="uiStore().loggedIn">
            <q-item
              clickable
              @click="logout()"
            >
              <q-item-section avatar>
                <q-icon name="mdi-logout" />
              </q-item-section>
              <q-item-section>Logout</q-item-section>
            </q-item>
          </template>
        </q-list>
      </q-menu>
    </ToolbarBtn>
  </template>
</template>

<script setup lang="ts">
import { BREAKPOINT_LG_MIN, BREAKPOINT_MD_MIN, isIncluded } from '@stdlib/misc';
import { logout } from 'src/code/auth/logout';
import { selfUserName } from 'src/code/self-user-name';

const quasarMode = process.env.MODE;
</script>
