// No real personal addresses in this public repository (abp/cell-email, rule N12; second
// read by specialist.abp, point 4). Every address-shaped string in a tracked file must be at a
// reserved example domain or .invalid, be an agent name (role@Team.person, which ends in a
// person's name, not a real domain), or be on the short list of public service addresses.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './helpers.mjs';

const ADDRESS = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;
const OK = [
  /@(?:[a-z0-9-]+\.)*example\.(?:com|net|org)$/i, // RFC 2606
  /@(?:[a-z0-9-]+\.)*invalid$/i,                  // RFC 2606
  /@[A-Za-z0-9-]+\.(?:dinis|person)$/,            // agent names: role@Team.person
];
// Public service addresses, each with why.
const SERVICES = new Set([
  'gmail-api-push@system.gserviceaccount.com', // Google's documented Gmail push publisher
]);

test('every address in the repository is made up, an agent name or a public service', () => {
  const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root })
    .toString().split('\0').filter((f) => f && f !== 'LICENSE');
  const bad = [];
  for (const f of files) {
    let text;
    try { text = readFileSync(join(root, f), 'utf8'); } catch { continue; }
    if (text.includes('\0')) continue;
    for (const m of text.matchAll(ADDRESS)) {
      const a = m[0];
      if (SERVICES.has(a.toLowerCase()) || OK.some((re) => re.test(a))) continue;
      bad.push(`${f}: an address outside the reserved domains`); // never print the address itself
    }
  }
  assert.deepEqual([...new Set(bad)], []);
});
