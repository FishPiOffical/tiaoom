import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: { index: 'lib/index.ts' },
    outDir: 'src/',
    format: ['cjs', 'esm'],
    dts: true,
    target: 'node16',
    sourcemap: true,
    clean: true,
  },
  {
    entry: { client: 'lib/client.ts' },
    outDir: 'src/',
    format: ['cjs', 'esm', 'iife'],
    globalName: 'Tiaoom',
    dts: true,
    target: 'es2018',
    minify: true,
    sourcemap: true,
    clean: false,
  },
]);