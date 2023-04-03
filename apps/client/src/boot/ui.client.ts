import { boot } from 'quasar/wrappers';

export default boot(({ store }) => {
  uiStore(store).leftSidebarExpanded = window.innerWidth > 1000;

  uiStore(store).currentPathExpanded =
    internals.localStorage.getItem('currentPathExpanded') !== 'false';
  uiStore(store).recentPagesExpanded =
    internals.localStorage.getItem('recentPagesExpanded') !== 'false';
});
