import { negateProp } from '@stdlib/misc';
import { defineStore } from 'pinia';

export const useUIStore = defineStore('ui', {
  state: () => ({
    loggedIn: false,

    leftSidebarExpanded: false,
    rightSidebarExpanded: false,

    currentPathExpanded: true,
    recentPagesExpanded: true,

    headerHeight: 0,

    width: 0,
    height: 0,
  }),

  getters: {},

  actions: {
    toggleLeftSidebar() {
      negateProp(this, 'leftSidebarExpanded');

      if (this.leftSidebarExpanded && window.innerWidth < 1065) {
        this.rightSidebarExpanded = false;
      }
    },
    toggleRightSidebar() {
      negateProp(this, 'rightSidebarExpanded');

      if (this.rightSidebarExpanded && window.innerWidth < 1065) {
        this.leftSidebarExpanded = false;
      }
    },
  },
});

export type UIStore = ReturnType<typeof useUIStore>;
