import { boot } from 'quasar/wrappers';

export default boot(async ({ app, store }) => {
  $quasar(app.config.globalProperties.$q);

  if (process.env.CLIENT) {
    appStore(store);
    authStore(store);
    uiStore(store);
    pagesStore(store);
  }
});
