import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const indexPath = join(dist, 'index.html');
let html = await readFile(indexPath, 'utf8');
const scriptPath = html.match(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/)?.[1];
const stylePath = html.match(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/)?.[1];

if (!scriptPath || !stylePath) throw new Error('Could not find the Vite app assets to inline');
const [script, style] = await Promise.all([
  readFile(join(dist, scriptPath.replace(/^\//, '')), 'utf8'),
  readFile(join(dist, stylePath.replace(/^\//, '')), 'utf8'),
]);

html = html
  .replace(/<script type="module"[^>]*src="[^"]+"[^>]*><\/script>/, `<script type="module">${script}</script>`)
  .replace(/<link rel="stylesheet"[^>]*href="[^"]+"[^>]*>/, `<style>${style}</style>`);
await writeFile(indexPath, html, 'utf8');
