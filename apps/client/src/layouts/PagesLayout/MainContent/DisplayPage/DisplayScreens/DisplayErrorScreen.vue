<template>
  {{ page.react.errorMessage }}
</template>

<script setup lang="ts">
import type { Page } from 'src/code/pages/page/page';

const page = inject<Page>('page')!;
</script>
