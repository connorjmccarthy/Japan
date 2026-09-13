// Quick syntax check of every browser module using node's parser (no bundler needed).
import { readdirSync, statSync, copyFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); } };
walk('src'); files.push('sw.js');
const dir = mkdtempSync(join(tmpdir(), 'chk-'));
let bad = 0;
for (const f of files) { const tmp = join(dir, 'x.mjs'); copyFileSync(f, tmp); const r = spawnSync('node', ['--check', tmp], { encoding: 'utf8' }); if (r.status !== 0) { bad++; console.error(`${f}\n${r.stderr}`); } }
console.log(bad ? `${bad} file(s) with syntax errors` : `${files.length} files OK`);
process.exit(bad ? 1 : 0);
