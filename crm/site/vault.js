// Read a vault in this browser through sgit's own vault library (SGSend, SGVault, SGVaultCrypto:
// the Email Cell's pinned copy, vendor/sg-vault/v0.2.3, loaded from this site). Read only: the CRM
// writes nothing yet. Accepts a vault key (sgit_private_vault_...) or a read key
// (sgit_private_read_... / sgit_public_read_...:<id>). Keys stay in memory unless the person asks
// to remember them, and then only sealed to this browser's own key (pki.js keep/recall).
// By crm.dev.a@AgentiCCells.dinis, 2026-11-23. Apache-2.0.

export const ENDPOINT = 'https://dev.send.sgraph.ai';
const lib = () => {
  if (typeof SGVault === 'undefined' || typeof SGSend === 'undefined') throw new Error('the vault library did not load');
  return { SGSend, SGVault, SGVaultCrypto };
};

// What a pasted key is, without opening anything: 'read', 'vault' or null.
export function keyKind(text) {
  const s = String(text || '').trim();
  if (!s) return null;
  const { SGVaultCrypto } = lib();
  if (SGVaultCrypto.parseReadOnlyCredential(s)) return 'read';
  if (/^(sgit_private_vault_)?[a-z0-9]{16,64}:[a-z0-9]{4,32}$/.test(s)) return 'vault';
  return null;
}

export async function openVault(key) {
  const { SGSend, SGVault, SGVaultCrypto } = lib();
  const send = new SGSend({ endpoint: ENDPOINT, token: '' });
  const s = String(key).trim();
  const ro = SGVaultCrypto.parseReadOnlyCredential(s);
  if (ro) {
    const c = await SGVaultCrypto.deriveReadOnlyCreds(ro.vaultId, ro.readKeyHex);
    return SGVault.openReadOnly(send, c.vaultId, c.readKeyB64, c.refFileId);
  }
  const branch = 'crm-' + Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, '0')).join('');
  return SGVault.open(send, SGVaultCrypto.stripKeyPrefix(s), { cloneBranch: branch });
}

const TEXT = /\.(json|md)$/;
// Every .json and .md file in the vault, as { 'path/in/vault': text }. Stops at `limit` files.
export async function readAll(vault, { limit = 20000, onProgress } = {}) {
  const out = {}, dec = new TextDecoder();
  let n = 0;
  async function walk(path) {
    if (vault.needsLoading(path)) await vault.loadSubTreeOnDemand(path);
    for (const e of vault.listFolder(path) || []) {
      const child = (path === '/' ? '' : path) + '/' + e.name;
      if (e.type === 'folder') { await walk(child); continue; }
      if (!TEXT.test(e.name)) continue;
      if (++n > limit) throw new Error(`more than ${limit} files: open a smaller vault`);
      const bytes = await vault.getFile(path, e.name);
      out[child.slice(1)] = typeof bytes === 'string' ? bytes : dec.decode(bytes);
      if (onProgress && n % 25 === 0) onProgress(n);
    }
  }
  await walk('/');
  return out;
}

// A CRM vault and, if its records point at a separate mail twin, that twin: merged into one map
// for crm.mjs readVault. The twin's own files come first; the CRM vault adds crm/ (and anything
// else it holds) on top. Returns { files, crmManifest, twinId, crmId, warnings }.
export function merge(crmFiles, twinFiles = null) {
  const warnings = [];
  const crmManifest = crmFiles['manifest.json'] ? JSON.parse(crmFiles['manifest.json']) : null;
  if (!twinFiles) return { files: crmFiles, crmManifest, warnings };
  const files = { ...twinFiles };
  for (const [p, t] of Object.entries(crmFiles)) if (p !== 'manifest.json' && p !== 'README.md') files[p] = t;
  return { files, crmManifest, warnings };
}

// The CRM writes only to a vault that says it is a CRM vault (its manifest), that was opened with a
// key that can write, and never to the mail twin. Returns a reason, or null when writing is allowed.
export const CRM_SCHEMAS = ['crm.vault/1', 'crm.demo/1'];
export function whyNotWritable(vault, manifest, { isTwin = false } = {}) {
  if (isTwin) return 'that is the mail twin: the CRM never writes to it';
  if (!vault) return 'no CRM vault is open';
  if (!vault.writable) return 'the CRM vault was opened with a read key';
  if (!manifest || !CRM_SCHEMAS.includes(manifest.schema)) return "the vault's manifest does not mark it as a CRM vault";
  return null;
}

// One file, one commit, published with compare-and-swap (merging if someone published first), as the
// Email Cell's vault.js does. `text` null removes the file. The access token is used for this call only.
// The library names the commit itself ("Add <file>", "Edit <file>", "Remove <file>").
export async function writeOne(vault, token, path, text) {
  vault._sgSend.token = token || '';
  try {
    const parts = path.split('/'), name = parts.pop(), folder = '/' + parts.join('/');
    let at = '';
    for (const part of parts) {
      const parent = at || '/';
      at += '/' + part;
      if (vault.needsLoading(parent)) await vault.loadSubTreeOnDemand(parent);
      if (!vault.listFolder(at)) { if (text == null) throw new Error('nothing to remove'); await vault.createFolder(at); }
      else if (vault.needsLoading(at)) await vault.loadSubTreeOnDemand(at);
    }
    const exists = (vault.listFolder(folder) || []).some((e) => e.name === name && e.type === 'file');
    if (text == null) { if (!exists) throw new Error('nothing to remove'); await vault.removeFile(folder, name); }
    else if (exists) await vault.updateFile(folder, name, new TextEncoder().encode(text));
    else await vault.addFile(folder, name, new TextEncoder().encode(text));
    if (vault._refManager.lastRawRef(vault._refFileId) === undefined) await vault.getBehindCount();
    try { await vault.pushIfMatch(); return; } catch (e) { if (e.code !== 'ECAS') throw e; }
    const theirs = await vault._refManager.readRef(vault._refFileId);
    const r = await vault.merge(theirs, { publish: false });
    if (r.conflicts.length) throw new Error('conflicts: ' + r.conflicts.join(', '));
    await vault.pushIfMatch();
  } finally { vault._sgSend.token = ''; }
}
