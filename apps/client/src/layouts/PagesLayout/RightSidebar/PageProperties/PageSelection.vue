<template>
  <div style="padding: 20px; display: flex; flex-direction: column">
    <DeepBtn
      v-if="pageSelectionStore().selectedPages.has(page.id)"
      label="Deselect this page"
      icon="mdi-selection-multiple"
      color="negative"
      @click="deselectPage"
    />
    <DeepBtn
      v-else
      label="Select this page"
      icon="mdi-selection-multiple"
      color="primary"
      @click="selectPage"
    />

    <Gap style="height: 16px" />

    <DeepBtn
      label="Select linked pages"
      icon="mdi-selection-multiple"
      color="primary"
      @click="selectLinkedPages"
    />
  </div>
</template>

<script setup lang="ts">
import type { Page } from 'src/code/pages/page/page';
import { pageSelectionStore } from 'src/stores/page-selection';
import type { Ref } from 'vue';

const page = inject<Ref<Page>>('page')!;

function selectPage() {
  pageSelectionStore().selectedPages.add(page.value.id);

  $quasar().notify({
    message: 'Page added to selection.',
    color: 'positive',
    timeout: 1000,
  });
}

function deselectPage() {
  pageSelectionStore().selectedPages.delete(page.value.id);

  $quasar().notify({
    message: 'Page removed from selection.',
    color: 'negative',
    timeout: 1000,
  });
}

function selectLinkedPages() {
  for (const note of Object.values(page.value.notes.react.map)) {
    const headMatches = (
      note.react.collab.head.value.toDOM().textContent ?? ''
    ).matchAll(/(?:\/pages\/([\w-]{21})\b)/g);

    const bodyMatches = (
      note.react.collab.head.value.toDOM().textContent ?? ''
    ).matchAll(/(?:\/pages\/([\w-]{21})\b)/g);

    const linkMatches = note.react.collab.link.matchAll(
      /^(?:https:\/\/deepnotes.app\/pages\/([\w-]{21})|\/pages\/([\w-]{21})|([\w-]{21}))$/g,
    );

    const matches = [...headMatches, ...bodyMatches, ...linkMatches];

    for (const match of matches) {
      for (let i = 1; i < match.length; i++) {
        if (match[i] != null && match[i] !== page.value.id) {
          pageSelectionStore().selectedPages.add(match[i]);
        }
      }
    }
  }

  $quasar().notify({
    message: 'Linked pages added to selection.',
    color: 'positive',
    timeout: 1000,
  });
}
</script>
