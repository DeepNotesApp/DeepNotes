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
      </q-list>
    </q-menu>
  </ToolbarBtn>
</template>

<script setup lang="ts">
import { logout } from 'src/code/auth/logout';
import { selfUserName } from 'src/code/self-user-name';
import { multiModePath } from 'src/code/utils/misc.js';
</script>
