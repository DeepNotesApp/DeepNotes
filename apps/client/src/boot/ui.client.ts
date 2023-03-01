import { boot } from 'quasar/wrappers';

export default boot(({ store }) => {
  uiStore(store).currentPathExpanded =
    internals.localStorage.getItem('currentPathExpanded') !== 'false';
  uiStore(store).recentPagesExpanded =
    internals.localStorage.getItem('recentPagesExpanded') !== 'false';
});
