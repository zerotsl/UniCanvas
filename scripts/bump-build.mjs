import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const target = fileURLToPath(new URL('../packages/infinite-canvas/client.js', import.meta.url));
let text = readFileSync(target, 'utf8');
const marker = /const CLIENT_BUILD = '(\d{4}-\d{2}-\d{2})\.(\d+)';/.exec(text);
if (!marker) {
  console.log('build marker not found');
  process.exit(1);
}
console.log('old build:', marker[1] + '.' + marker[2]);
const today = new Date().toISOString().slice(0, 10);
const next = marker[1] === today ? today + '.' + (Number(marker[2]) + 1) : today + '.1';
text = text.replace(/const CLIENT_BUILD = '[^']+';/, "const CLIENT_BUILD = '" + next + "';");
writeFileSync(target, text);
console.log('new build:', next);
