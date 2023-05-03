import { boot } from 'quasar/wrappers';

export default boot(async ({ app }) => {
  app.config.unwrapInjectedRef = true;

  app.config.globalProperties.global = globalThis;
  app.config.globalProperties.internals = internals;

  app.config.globalProperties.appStore = appStore;
  app.config.globalProperties.authStore = authStore;
  app.config.globalProperties.uiStore = uiStore;
  app.config.globalProperties.pagesStore = pagesStore;
});
