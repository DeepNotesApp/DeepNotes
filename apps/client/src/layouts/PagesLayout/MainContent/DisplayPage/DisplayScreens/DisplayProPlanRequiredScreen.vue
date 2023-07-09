<template>
  <div style="max-width: 250px">
    <div>This page is part of a private group.</div>
    <div>Access private groups with a Pro plan subscription.</div>
  </div>

  <template v-if="!($q.platform.is.capacitor && $q.platform.is.ios)">
    <Gap style="height: 16px" />

    <DeepBtn
      label="See subscription plans"
      color="primary"
      :href="multiModePath('/pricing')"
    />
  </template>
</template>

<script setup lang="ts">
import { multiModePath } from 'src/code/utils/misc';
</script>
