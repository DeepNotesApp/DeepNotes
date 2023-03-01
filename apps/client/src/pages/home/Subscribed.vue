<template>
  <q-page>
    <ResponsiveContainer
      style="
        max-width: 700px;
        display: flex;
        flex-direction: column;
        align-items: center;
      "
    >
      <Gap style="height: 128px" />

      <div
        style="
          max-width: 450px;
          font-size: 40px;
          font-weight: bold;
          text-align: center;
        "
      >
        Thanks for choosing the Pro Plan!
      </div>

      <Gap style="height: 48px" />

      Enjoy unlimited pages, collaborative groups, and version history for your
      notes!

      <Gap style="height: 36px" />

      <div style="display: flex">
        <DeepBtn
          label="Go to pages"
          color="primary"
          :href="multiModePath('/pages')"
          style="height: 44px"
        />
      </div>

      <Gap style="height: 160px" />
    </ResponsiveContainer>
  </q-page>
</template>

<script setup lang="ts">
import { multiModePath } from 'src/code/utils.universal';
</script>
