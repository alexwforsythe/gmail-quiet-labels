import gas from '@gas-plugin/unplugin/esbuild';
import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  // Transpile to latest JS language spec supported by Google Apps Script.
  target: 'es2020',
  outdir: 'dist',
  plugins: [gas()],
});
