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

export const leftSidebarSectionNames = [
  'currentPath',
  'recentPages',
  'favoritePages',
  'selectedPages',
] as const;

export type LeftSidebarSectionName = (typeof leftSidebarSectionNames)[number];

export const leftSidebarSectionIndexes = Object.fromEntries(
  leftSidebarSectionNames.map((section, index) => [section, index]),
);

export const useUIStore = defineStore('ui', () => {
  const state = reactive({
    loggedIn: false,

    leftSidebarExpanded: false,
    rightSidebarExpanded: false,

    leftSidebarWidth: 240,

    currentPathExpanded: true,
    recentPagesExpanded: true,
    favoritePagesExpanded: false,
    selectedPagesExpanded: false,

    currentPathWeight: 1,
    recentPagesWeight: 1,
    favoritePagesWeight: 1,
    selectedPagesWeight: 1,

    headerHeight: 0,

    width: 0,
    height: 0,
  });

  trackProp(state, 'leftSidebarExpanded');
  trackProp(state, 'rightSidebarExpanded');

  trackProp(state, 'leftSidebarWidth');

  for (const section of leftSidebarSectionNames) {
    trackProp(state, `${section}Expanded`);
    trackProp(state, `${section}Weight`);
  }

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
          ...leftSidebarSectionNames.map(
            (section) => state[`${section}Weight`],
          ),
        ),
        1e-10,
        1e10,
      );

      for (const section of leftSidebarSectionNames) {
        state[`${section}Weight`] =
          minmax(state[`${section}Weight`] / min, 1e-10, 1e10) || 1;
      }
    },
  };
});

export type UIStore = ReturnType<typeof useUIStore>;
