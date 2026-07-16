import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'dist');
const bundlePath = path.join(outDir, 'soldier-abm-v29.bundle.js');
const outputPath = path.join(outDir, 'soldier_ABM_v29.html');
const releaseCopyPath = path.resolve(root, '..', 'soldier_ABM_v29.html');

fs.mkdirSync(outDir, { recursive: true });
await build({
  entryPoints: [path.join(root, 'src', 'main.js')],
  bundle: true,
  format: 'iife',
  target: ['es2022'],
  minify: false,
  legalComments: 'none',
  outfile: bundlePath
});

const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const bundle = fs.readFileSync(bundlePath, 'utf8');
const standalone = index
  .replace('<link rel="stylesheet" href="./styles.css">', `<style>\n${styles}\n</style>`)
  .replace('<script type="module" src="./src/main.js"></script>', `<script>\n${bundle}\n</script>`)
  .replace('</head>', '<meta name="soldier-abm-version" content="29">\n</head>');

fs.writeFileSync(outputPath, standalone, 'utf8');
fs.writeFileSync(releaseCopyPath, standalone, 'utf8');
console.log(`built ${outputPath}`);
