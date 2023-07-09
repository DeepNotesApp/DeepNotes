<template>
  <ToolbarBtn
    tooltip="Account"
    icon="mdi-account"
    icon-size="30px"
    round
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

          <q-item
            clickable
            :href="multiModePath('/account/general')"
          >
            <q-item-section avatar>
              <q-icon name="mdi-account" />
            </q-item-section>
            <q-item-section>Account settings</q-item-section>
          </q-item>
        </template>

        <template v-else>
          <q-item
            clickable
            :href="multiModePath('/login')"
          >
            <q-item-section avatar>
              <q-icon name="mdi-login" />
            </q-item-section>
            <q-item-section>Login</q-item-section>
          </q-item>

          <q-item
            clickable
            :href="multiModePath('/register')"
          >
            <q-item-section avatar>
              <q-icon name="mdi-account-plus" />
            </q-item-section>
            <q-item-section>Register</q-item-section>
          </q-item>
        </template>

        <q-item
          clickable
          :href="multiModePath('/pricing')"
        >
          <q-item-section avatar>
            <q-icon name="mdi-currency-usd" />
          </q-item-section>
          <q-item-section>Pricing</q-item-section>
        </q-item>

        <q-item
          v-if="isIncluded(quasarMode, ['ssr', 'spa'])"
          clickable
          :href="multiModePath('/download')"
        >
          <q-item-section avatar>
            <q-icon name="mdi-download" />
          </q-item-section>
          <q-item-section>Download</q-item-section>
        </q-item>

        <q-item
          clickable
          :href="multiModePath('/whitepaper')"
        >
          <q-item-section avatar>
            <q-icon name="mdi-file-document" />
          </q-item-section>
          <q-item-section>Whitepaper</q-item-section>
        </q-item>
      </q-list>

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
    </q-menu>
  </ToolbarBtn>
</template>

<script setup lang="ts">
import { isIncluded } from '@stdlib/misc';
import { logout } from 'src/code/auth/logout';
import { selfUserName } from 'src/code/self-user-name';
import { multiModePath } from 'src/code/utils/misc';

const quasarMode = process.env.MODE;
</script>
