import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true, // Clean output directory before each build

  entry: ['src/index.ts'],
  format: ['cjs'],
  minify: true,
  sourcemap: false,
  splitting: false,
  dts: false,
  noExternal: [/^(?!knex|ws|@getbrevo\/brevo).+$/],
});
