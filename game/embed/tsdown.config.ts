import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: { embed: 'src/index.ts' },
    outDir: '../frontend/public/',
    format: ['iife'],
    globalName: 'GameHook',
    dts: false,
    target: 'es2018',
    minify: false,
    sourcemap: false,
    clean: false,
    bundle: true,
    noExternal: ['reconnecting-websocket', 'tiaoom/client'],
  },
]);