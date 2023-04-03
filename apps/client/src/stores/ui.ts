import { negateProp } from '@stdlib/misc';
import { defineStore } from 'pinia';

export const useUIStore = defineStore('ui', () => {
  const state = reactive({
    loggedIn: false,

    leftSidebarExpanded: false,
    rightSidebarExpanded: false,

    currentPathExpanded: true,
    recentPagesExpanded: true,

    headerHeight: 0,

    width: 0,
    height: 0,
  });

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
