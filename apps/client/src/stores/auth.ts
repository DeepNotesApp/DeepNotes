import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', () => {
  const state = reactive({
    loggedIn: false,

    userId: '',
    sessionId: '',

    oldSessionKey: '',
    newSessionKey: '',

    redirect: ref(''),
  });

  return {
    ...toRefs(state),
  };
});

export type AuthStore = ReturnType<typeof useAuthStore>;
