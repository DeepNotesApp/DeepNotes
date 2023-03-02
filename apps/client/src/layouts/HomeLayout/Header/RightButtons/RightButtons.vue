<template>
  <template v-if="uiStore().width >= BREAKPOINT_MD_MIN">
    <template v-if="!uiStore().loggedIn">
      <DeepBtn
        label="Login"
        flat
        class="toolbar-btn"
        :to="{ name: 'login' }"
      />

      <div style="width: 16px"></div>

      <DeepBtn
        label="Start for free"
        class="toolbar-btn"
        color="primary"
        :to="{ name: 'register' }"
      />
    </template>

    <template v-if="uiStore().loggedIn">
      <DeepBtn
        color="primary"
        :href="multiModePath('/pages')"
        style="height: 46px"
      >
        <span style="font-weight: bold">Go to pages</span>
        <span style="margin-left: 3px; font-weight: bold; font-size: 1.3em">
          →
        </span>
      </DeepBtn>
    </template>
  </template>

  <template v-if="uiStore().loggedIn">
    <Gap style="width: 24px" />

    <ToolbarBtn
      icon="mdi-account-circle"
      icon-size="38px"
      btn-size="36px"
      round
      style="margin: 0"
    >
      <q-menu
        anchor="bottom right"
        self="top right"
        auto-close
      >
        <q-list>
          <q-item>
            <q-item-section style="font-weight: bold">
              <q-item-label>
                {{ selfUserName().get() }}
              </q-item-label>
            </q-item-section>
          </q-item>

          <q-separator />

          <q-item
            v-if="uiStore().width < BREAKPOINT_MD_MIN"
            clickable
            :href="multiModePath('/pages')"
          >
            <q-item-section avatar>
              <q-icon name="mdi-note-multiple" />
            </q-item-section>
            <q-item-section>Go to pages</q-item-section>
          </q-item>

          <q-item
            clickable
            :to="{ name: 'account/general' }"
          >
            <q-item-section avatar>
              <q-icon name="mdi-account" />
            </q-item-section>
            <q-item-section>Account</q-item-section>
          </q-item>

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
          </template>

          <q-item
            clickable
            @click="logout()"
          >
            <q-item-section avatar>
              <q-icon name="mdi-logout" />
            </q-item-section>
            <q-item-section>Logout</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </ToolbarBtn>
  </template>
</template>

<script setup lang="ts">
import { BREAKPOINT_LG_MIN, BREAKPOINT_MD_MIN } from '@stdlib/misc';
import { logout } from 'src/code/auth/logout.client';
import { selfUserName } from 'src/code/self-user-name.client';
import { multiModePath } from 'src/code/utils.universal';
</script>
