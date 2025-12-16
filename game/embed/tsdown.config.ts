import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: { embed: 'src/index.ts' },
    outDir: '../frontend/public/',
    format: ['iife'],
    globalName: 'GameEmbed',
    dts: false,
    target: 'es2018',
    minify: true,
    sourcemap: false,
    clean: false,
    noExternal: ['reconnecting-websocket', 'tiaoom/client'],
  },
]);