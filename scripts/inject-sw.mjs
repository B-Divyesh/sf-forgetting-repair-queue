import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';

const root = new URL('../dist/', import.meta.url);
const rootPath = root.pathname;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => entry.isDirectory() ? walk(join(directory, entry.name)) : join(directory, entry.name)));
  return files.flat();
}

const files = (await walk(rootPath))
  .filter((file) => !file.endsWith('.map') && !file.endsWith('sw.js') && !file.includes(`${sep}.vite${sep}`))
  .map((file) => `/${relative(rootPath, file).split(sep).join('/')}`)
  .sort();
const precache = [...new Set(['/','/index.html', ...files])];
const swPath = join(rootPath, 'sw.js');
const source = await readFile(swPath, 'utf8');
if (!source.includes("'__PRECACHE__'")) throw new Error('Service worker precache placeholder is missing');
const version = `repair-queue-${createHash('sha256').update(precache.join('|')).digest('hex').slice(0, 10)}`;
await writeFile(swPath, source.replace("'__PRECACHE__'", JSON.stringify(precache)).replace('__VERSION__', version), 'utf8');
