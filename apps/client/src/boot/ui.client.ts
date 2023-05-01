import { boot } from 'quasar/wrappers';

export default boot(({ store }) => {
  if (internals.localStorage.getItem('leftSidebarExpanded') != null) {
    uiStore(store).leftSidebarExpanded =
      internals.localStorage.getItem('leftSidebarExpanded') !== 'false';
  } else {
    uiStore(store).leftSidebarExpanded = window.innerWidth > 1000;
  }

  uiStore(store).rightSidebarExpanded =
    internals.localStorage.getItem('rightSidebarExpanded') === 'true';

  if (internals.localStorage.getItem('leftSidebarWidth') != null) {
    uiStore(store).leftSidebarWidth = parseInt(
      internals.localStorage.getItem('leftSidebarWidth') as string,
    );
  }

  uiStore(store).currentPathExpanded =
    internals.localStorage.getItem('currentPathExpanded') !== 'false';
  uiStore(store).recentPagesExpanded =
    internals.localStorage.getItem('recentPagesExpanded') !== 'false';
});
