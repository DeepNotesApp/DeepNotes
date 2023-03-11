<template>
  <template></template>
</template>

<script setup lang="ts">
import { groupNames } from 'src/code/pages/computed/group-names.client';
import { getPageTitle } from 'src/code/pages/utils.client';

useMeta(() => {
  const page = internals.pages?.react.page;

  if (page == null) {
    return { title: 'DeepNotes' };
  }

  const groupName = groupNames()(page.react.groupId).get().text;
  const pageTitle = getPageTitle(page.id, { prefer: 'absolute' }).text;

  return { title: `${pageTitle} - ${groupName}` };
});

onMounted(async () => {
  await internals.pages.setupPage(route().value.params.pageId as string);

  pagesStore().loading = false;
});

onBeforeUpdate(async () => {
  await internals.pages.setupPage(route().value.params.pageId as string);
});
</script>
