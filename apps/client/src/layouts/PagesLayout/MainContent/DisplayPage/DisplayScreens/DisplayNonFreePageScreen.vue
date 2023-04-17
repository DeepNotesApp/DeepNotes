<template>
  <div>This page was created with the Pro plan.</div>
  <div>Upgrade your subscription to access this page.</div>

  <Gap style="height: 16px" />

  <DeepBtn
    label="See subscription plans"
    color="primary"
    :href="multiModePath('/pricing')"
  />
</template>

<script setup lang="ts">
import { multiModePath } from 'src/code/utils/misc.js';
</script>
