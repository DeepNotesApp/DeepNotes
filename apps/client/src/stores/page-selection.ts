import { defineStore } from 'pinia';
import { makeStoreFunc } from 'src/code/stores';

const _usePageSelection = defineStore('page-selection', () => {
  const state = reactive({
    selectedPages: new Set<string>(),
  });

  return {
    ...toRefs(state),
  };
});

export const pageSelectionStore = makeStoreFunc(_usePageSelection);
