/* eslint-env node */

/*
 * This file runs in a Node context (it's NOT transpiled by Babel), so use only
 * the ES6 features that are supported by your Node version. https://node.green/
 */

// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-js

const AutoImport = require('unplugin-auto-import/vite');
const VueComponents = require('unplugin-vue-components/vite');

const { hashFNV1a, objFromEntries } = require('@stdlib/misc');

const dotenv = require('dotenv');

const env = Object.assign(
  {},
  require('dotenv-expand').expand(
    dotenv.config({ path: '../../.env' }).parsed?.DEV
      ? dotenv.config({ path: '../../.env' }).parsed?.PRODEV
        ? dotenv.config({ path: '../../.env.prodev' })
        : dotenv.config({ path: '../../.env.dev' })
      : dotenv.config({ path: '../../.env.prod' }),
  ).parsed,
  objFromEntries(
    Object.entries(process.env ?? {}).filter(([key]) => /^\w+$/.test(key)),
  ),
);

const { configure } = require('quasar/wrappers');
const path = require('path');

module.exports = configure(function (ctx) {
  return {
    eslint: {
      // fix: true,
      // include = [],
      // exclude = [],
      // rawOptions = {},
      warnings: true,
      errors: true,
    },

    // https://v2.quasar.dev/quasar-cli-vite/prefetch-feature
    // preFetch: true,

    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli-vite/boot-files
    boot: [
      { path: 'internals.universal' },
      { path: 'helpers.universal' },
      { path: 'sodium.universal' },
      { path: 'i18n.universal' },
      { path: 'vue.universal' },
      { path: 'disable-cache.universal' },

      { path: 'array-at-polyfill.client', server: false },
      { path: 'cross-tab-session-storage.client', server: false },
      { path: 'auth.client', server: false },
      { path: 'ui.client', server: false },
      { path: 'prosemirror.client', server: false },
      { path: 'syncedstore.client', server: false },
      { path: 'tiptap/index.client', server: false },
      { path: 'stripe.client', server: false },
      { path: 'zxcvbn.client', server: false },
    ],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#css
    css: ['app.scss'],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      'mdi-v5',
      // 'fontawesome-v6',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!

      'roboto-font', // optional, you are not bound to it
      'material-icons', // optional, you are not bound to it
    ],

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#build
    build: {
      target: {
        browser: ['es2019', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
        node: 'node16',
      },

      vueRouterMode: 'hash', // available values: 'hash', 'history'
      // vueRouterBase,
      // vueDevtools,
      // vueOptionsAPI: false,

      // rebuildCache: true, // rebuilds Vite/linter/etc cache on startup

      // publicPath: '/',
      // analyze: true,
      env,
      // rawDefine: {}
      // ignorePublicFolder: true,
      minify: true,
      // polyfillModulePreload: true,
      // distDir

      // extendViteConf (viteConf) {},
      // viteVuePluginOptions: {},

      vitePlugins: [
        [
          '@intlify/vite-plugin-vue-i18n',
          {
            // if you want to use Vue I18n Legacy API, you need to set `compositionOnly: false`
            // compositionOnly: false,

            // you need to set i18n resource including paths !
            include: path.resolve(__dirname, './src/i18n/**'),
          },
        ],

        AutoImport({
          // targets to transform
          include: [
            /\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
            /\.vue$/,
            /\.vue\?vue/, // .vue
            /\.md$/, // .md
          ],

          // global imports to register
          imports: [
            // presets
            'vue',
            'vue-router',
            {
              'src/code/trpc': ['trpcClient'],

              'src/code/internals': ['internals'],

              'src/code/stores': [
                'appStore',
                'authStore',
                'uiStore',
                'pagesStore',
              ],
              'src/code/helpers': ['router', 'route', '$quasar'],

              'src/components/CustomDialog.vue': [['default', 'CustomDialog']],

              '@stdlib/misc': ['mainLogger'],

              quasar: [
                'useQuasar',
                'Notify',
                'Cookies',
                'useMeta',
                'Dialog',
                'useDialogPluginComponent',
              ],
            },
          ],

          // Auto import for module exports under directories
          // by default it only scan one level of modules under the directory
          dirs: [
            // './hooks',
            // './composables' // only root modules
            // './composables/**', // all nested modules
            // ...
          ],

          // Filepath to generate corresponding .d.ts file.
          // Defaults to './auto-imports.d.ts' when `typescript` is installed locally.
          // Set `false` to disable.
          dts: './auto-imports.d.ts',
        }),

        VueComponents({
          dts: true,
        }),
      ],
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#devServer
    devServer: {
      https: false,
      open: false, // opens browser window automatically
      port:
        1024 + (Math.abs(hashFNV1a(JSON.stringify(ctx.mode))) % (65536 - 1024)),
      host: '0.0.0.0',
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#framework
    framework: {
      config: {
        dark: true,
      },

      // iconSet: 'material-icons', // Quasar icon set
      // lang: 'en-US', // Quasar language pack

      // For special cases outside of where the auto-import strategy can have an impact
      // (like functional components as one of the examples),
      // you can manually specify Quasar components/directives to be available everywhere:
      //
      // components: [],
      // directives: [],

      // Quasar plugins
      plugins: ['Notify', 'Cookies', 'Meta', 'Dialog'],
    },

    // animations: 'all', // --- includes all animations
    // https://v2.quasar.dev/options/animations
    animations: [],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#sourcefiles
    // sourceFiles: {
    //   rootComponent: 'src/App.vue',
    //   router: 'src/router/index',
    //   store: 'src/store/index',
    //   registerServiceWorker: 'src-pwa/register-service-worker',
    //   serviceWorker: 'src-pwa/custom-service-worker',
    //   pwaManifestFile: 'src-pwa/manifest.json',
    //   electronMain: 'src-electron/electron-main',
    //   electronPreload: 'src-electron/electron-preload'
    // },

    // https://v2.quasar.dev/quasar-cli-vite/developing-ssr/configuring-ssr
    ssr: {
      // ssrPwaHtmlFilename: 'offline.html', // do NOT use index.html as name!
      // will mess up SSR

      // extendSSRWebserverConf (esbuildConf) {},
      // extendPackageJson (json) {},

      pwa: false,

      // manualStoreHydration: true,
      // manualPostHydrationTrigger: true,

      prodPort: process.env.CLIENT_PORT, // The default port that the production server should use
      // (gets superseded if process.env.PORT is specified at runtime)

      middlewares: [
        'render', // keep this as last one
      ],
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-pwa/configuring-pwa
    pwa: {
      workboxMode: 'generateSW', // or 'injectManifest'
      injectPwaMetaTags: true,
      swFilename: 'sw.js',
      manifestFilename: 'manifest.json',
      useCredentialsForManifestTag: false,
      // useFilenameHashes: true,
      // extendGenerateSWOptions (cfg) {}
      // extendInjectManifestOptions (cfg) {},
      // extendManifestJson (json) {}
      // extendPWACustomSWConf (esbuildConf) {}
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-cordova-apps/configuring-cordova
    cordova: {
      // noIosLegacyBuildFlag: true, // uncomment only if you know what you are doing
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true,
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/configuring-electron
    electron: {
      // extendElectronMainConf (esbuildConf)
      // extendElectronPreloadConf (esbuildConf)

      inspectPort: 5858,

      bundler: 'builder', // 'packager' or 'builder'

      packager: {
        // https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#options
        // OS X / Mac App Store
        // appBundleId: '',
        // appCategoryType: '',
        // osxSign: '',
        // protocol: 'myapp://path',
        // Windows only
        // win32metadata: { ... }
      },

      builder: {
        // https://www.electron.build/configuration/configuration

        appId: '@deepnotes/client',
      },
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-browser-extensions/configuring-bex
    bex: {
      contentScripts: ['my-content-script'],

      // extendBexScriptsConf (esbuildConf) {}
      // extendBexManifestJson (json) {}
    },
  };
});
