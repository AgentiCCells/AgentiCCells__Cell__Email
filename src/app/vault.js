// The user's twin vault, through sgit's own vault library (SGSend, SGVault: the twelve scripts
// pinned under vendor/sg-vault/v0.2.3, loaded from this site). The helpers follow
// https://sgit.ai/docs/vault/vault-from-javascript.html: load a folder before writing into it,
// publish with compare-and-swap and merge on ECAS, never push(). Nothing here stores a key: the
// vault key and the access token live in the page's memory and go when the tab closes.
// By cell.email@AgentiCCells.dinis, 2026-11-16. Apache-2.0.

export const ENDPOINT = 'https://dev.send.sgraph.ai';
const lib = () => {
  if (typeof SGVault === 'undefined' || typeof SGSend === 'undefined') throw new Error('the vault library did not load');
  return { SGSend, SGVault, SGVaultCrypto };
};

export function randomPassphrase(n = 24) {
  const abc = 'abcdefghijklmnopqrstuvwxyz0123456789', out = [];
  while (out.length < n) for (const b of crypto.getRandomValues(new Uint8Array(n))) if (b < 252 && out.length < n) out.push(abc[b % 36]);
  return out.join('');
}

// A clone branch for this tab: devices must not share the library's default 'web-ui'.
const BRANCH = 'ec-' + Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, '0')).join('');

export const client = (token) => new (lib().SGSend)({ endpoint: ENDPOINT, token: token || '' });

export async function createTwinVault(token) {
  const { SGVault } = lib();
  return SGVault.create(client(token), randomPassphrase(), { name: 'Email twin', description: 'A twin of a mailbox, written by the Email AgenticCell browser gateway' });
}

export async function openTwinVault(token, key) {
  const { SGVault, SGVaultCrypto } = lib();
  return SGVault.open(client(token), SGVaultCrypto.stripKeyPrefix(String(key).trim()), { cloneBranch: BRANCH });
}

// "sgit_private_vault_<passphrase>:<id>", the form sgit prints and reads back.
export function displayKey(vault) {
  const k = vault.getVaultKey();
  return 'sgit_private_' + 'vault_' + k;
}

export async function ensureLoaded(vault, folder) {
  let path = '';
  for (const part of folder.split('/').filter(Boolean)) {
    path += '/' + part;
    if (vault.needsLoading(path)) await vault.loadSubTreeOnDemand(path);
  }
}

async function ensureFolder(vault, folder) {
  let path = '';
  for (const part of folder.split('/').filter(Boolean)) {
    const parent = path || '/';
    path += '/' + part;
    if (vault.needsLoading(parent)) await vault.loadSubTreeOnDemand(parent);
    if (!vault.listFolder(path)) await vault.createFolder(path);
    else if (vault.needsLoading(path)) await vault.loadSubTreeOnDemand(path);
  }
}

export async function readJson(vault, folder, name) {
  await ensureLoaded(vault, folder);
  if (!(vault.listFolder(folder) || []).some((e) => e.name === name && e.type === 'file')) return null;
  return JSON.parse(new TextDecoder().decode(await vault.getFile(folder, name)));
}

// Write many files: new ones together in commits of up to 200, existing ones one by one.
export async function writeMany(vault, files, progress = () => {}) {
  const enc = (s) => new TextEncoder().encode(s);
  const folders = [...new Set(files.map((f) => f.folder))].sort();
  for (const f of folders) await ensureFolder(vault, f);
  const exists = (f) => (vault.listFolder(f.folder) || []).some((e) => e.name === f.name && e.type === 'file');
  const fresh = files.filter((f) => !exists(f)), old = files.filter(exists);
  let done = 0;
  for (let i = 0; i < fresh.length; i += 200) {
    const chunk = fresh.slice(i, i + 200);
    await vault.addFiles(chunk.map((f) => ({ folderPath: f.folder, fileName: f.name, fileData: enc(f.data) })));
    done += chunk.length; progress(done, files.length);
  }
  for (const f of old) { await vault.updateFile(f.folder, f.name, enc(f.data)); done++; progress(done, files.length); }
}

export async function publish(vault) {
  if (vault._refManager.lastRawRef(vault._refFileId) === undefined) await vault.getBehindCount();
  try { await vault.pushIfMatch(); return; } catch (e) { if (e.code !== 'ECAS') throw e; }
  const theirs = await vault._refManager.readRef(vault._refFileId);
  const r = await vault.merge(theirs, { publish: false });
  if (r.conflicts.length) throw new Error('conflicts: ' + r.conflicts.join(', '));
  await vault.pushIfMatch();
}

// What the vault already holds, for an incremental sync.
export async function readState(vault) {
  const idx = await readJson(vault, '/index', 'messages.json');
  const correspondents = await readJson(vault, '/index', 'correspondents.json');
  return { ids: idx?.ids || {}, correspondents, threads: {} };
}

export async function readThreads(vault, ids) {
  const out = {};
  for (const id of ids) { const t = await readJson(vault, '/threads', `${id}.json`); if (t) out[id] = t; }
  return out;
}
