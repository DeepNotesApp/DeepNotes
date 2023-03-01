import { defineConfig } from 'tsup';

function dedupeItems(array: string[]) {
  return [...new Set(array)];
}

function regexExclude(items: string[]) {
  return new RegExp(
    `^(?!${dedupeItems(items)
      .map((item) => item.replace('/', '\\/'))
      .join('|')}).*$`,
  );
}

function regexInclude(items: string[]) {
  return new RegExp(
    `^(${dedupeItems(items)
      .map((item) => item.replace('/', '\\/'))
      .join('|')})$`,
  );
}

const externalDependencies = ['knex', 'ws', '@nestjs/.+', 'msgpackr'];

console.log('External dependencies:', externalDependencies);

export default defineConfig({
  clean: true, // Clean output directory before each build

  entry: ['dist/main.js'],
  format: ['cjs'],
  outDir: 'bundle',

  minify: false,
  sourcemap: false,
  splitting: false,
  dts: false,
  noExternal: [regexExclude(externalDependencies)],
  external: [regexInclude(externalDependencies)],
});
