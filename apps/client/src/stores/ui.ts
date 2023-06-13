import { negateProp } from '@stdlib/misc';
import { defineStore } from 'pinia';

function watchProp<State>(state: State, prop: Extract<keyof State, string>) {
  watch(
    () => state[prop],
    (value) => {
      internals.localStorage.setItem(prop, String(value));
    },
  );
}

export const useUIStore = defineStore('ui', () => {
  const state = reactive({
    loggedIn: false,

    leftSidebarExpanded: false,
    rightSidebarExpanded: false,

    leftSidebarWidth: 240,

    currentPathExpanded: true,
    recentPagesExpanded: true,

    headerHeight: 0,

    width: 0,
    height: 0,
  });

  watchProp(state, 'leftSidebarExpanded');
  watchProp(state, 'rightSidebarExpanded');

  watchProp(state, 'leftSidebarWidth');

  watchProp(state, 'currentPathExpanded');
  watchProp(state, 'recentPagesExpanded');

  return {
    ...toRefs(state),

    toggleLeftSidebar() {
      negateProp(state, 'leftSidebarExpanded');

      if (state.leftSidebarExpanded && window.innerWidth < 1065) {
        state.rightSidebarExpanded = false;
      }
    },
    toggleRightSidebar() {
      negateProp(state, 'rightSidebarExpanded');

      if (state.rightSidebarExpanded && window.innerWidth < 1065) {
        state.leftSidebarExpanded = false;
      }
    },
  };
});

export type UIStore = ReturnType<typeof useUIStore>;
