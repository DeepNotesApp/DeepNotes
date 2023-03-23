<template>
  <div style="display: flex; flex-direction: column">
    <div>
      Display name

      <q-icon
        name="mdi-information"
        size="15px"
        style="margin-top: -1px; opacity: 0.9"
      >
        <q-tooltip
          anchor="top middle"
          self="bottom middle"
          transition-show="jump-up"
          transition-hide="jump-down"
          max-width="230px"
        >
          This is your default name in collaborative groups. This value is
          encrypted, unreadable to the server.
        </q-tooltip>
      </q-icon>
    </div>

    <Gap style="height: 10px" />

    <TextField
      :model-value="selfUserName().get()"
      @update:model-value="selfUserName().set($event as string)"
      filled
      dense
      style="max-width: 300px"
      :maxlength="maxNameLength"
    />

    <Gap style="height: 24px" />

    <q-separator />

    <Gap style="height: 20px" />

    <div>User infos</div>

    <Gap style="height: 10px" />

    <TextField
      label="User ID"
      :model-value="authStore().userId"
      dense
      style="max-width: 300px"
      readonly
      copy-btn
    />

    <Gap style="height: 16px" />

    <TextField
      label="User public key"
      :model-value="bytesToBase64(internals.keyPair.publicKey.value)"
      dense
      style="max-width: 300px"
      readonly
      copy-btn
    />
  </div>
</template>

<script setup lang="ts">
import { maxNameLength } from '@deeplib/misc';
import { bytesToBase64 } from '@stdlib/base64';
import { selfUserName } from 'src/code/self-user-name';
</script>
