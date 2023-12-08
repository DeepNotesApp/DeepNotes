import { minmax, negateProp } from '@stdlib/misc';
import { defineStore } from 'pinia';

function trackProp<State>(state: State, prop: Extract<keyof State, string>) {
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
    selectedPagesExpanded: false,

    currentPathWeight: 1,
    recentPagesWeight: 1,
    selectedPagesWeight: 1,

    headerHeight: 0,

    width: 0,
    height: 0,
  });

  trackProp(state, 'leftSidebarExpanded');
  trackProp(state, 'rightSidebarExpanded');

  trackProp(state, 'leftSidebarWidth');

  trackProp(state, 'currentPathExpanded');
  trackProp(state, 'recentPagesExpanded');
  trackProp(state, 'selectedPagesExpanded');

  trackProp(state, 'currentPathWeight');
  trackProp(state, 'recentPagesWeight');
  trackProp(state, 'selectedPagesWeight');

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

    resetLeftSidebarWidth() {
      state.leftSidebarWidth = 240;
    },

    normalizeWeights() {
      const min = minmax(
        Math.min(
          state.currentPathWeight,
          state.recentPagesWeight,
          state.selectedPagesWeight,
        ),
        1e-10,
        1e10,
      );

      state.currentPathWeight =
        minmax(state.currentPathWeight / min, 1e-10, 1e10) || 1;
      state.recentPagesWeight =
        minmax(state.recentPagesWeight / min, 1e-10, 1e10) || 1;
      state.selectedPagesWeight =
        minmax(state.selectedPagesWeight / min, 1e-10, 1e10) || 1;
    },
  };
});

export type UIStore = ReturnType<typeof useUIStore>;
