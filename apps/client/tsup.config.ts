import { defineConfig } from 'tsup';

export default defineConfig({
  clean: false, // Clean output directory before each build
  entry: ['dist/ssr/index.js'],
  outDir: 'dist/ssr',
  outExtension({ format }: any) {
    return { js: `.${format}` };
  },
  format: ['cjs'],
  minify: true,
  sourcemap: false,
  splitting: false,
  dts: false,
  noExternal: [/^(@deeplib|@stdlib)\/.+$/],
  external: [
    '@capacitor/android',
    '@capacitor/app',
    '@capacitor/clipboard',
    '@capacitor/core',
    '@capacitor/ios',
    '@capacitor/splash-screen',
    '@revenuecat/purchases-capacitor',
  ],
});
