import { defineStore } from 'pinia';

export const useAppStore = defineStore('app', () => {
  const state = reactive({
    loading: true,

    dict: {} as Record<string, any>,
  });

  return {
    ...toRefs(state),
  };
});

export type AppStore = ReturnType<typeof useAppStore>;
