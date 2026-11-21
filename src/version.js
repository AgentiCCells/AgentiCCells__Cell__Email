// Shows version.json: every field, with the commit linked to GitHub. By cell.email.b@AgentiCCells.dinis, 2026-11-21. Apache-2.0.
(async () => {
  const REPO = 'https://github.com/AgentiCCells/AgentiCCells__Cell__Email';
  const dl = document.getElementById('details'), raw = document.getElementById('raw');
  try {
    const v = await (await fetch('version.json', { cache: 'no-cache' })).json();
    raw.textContent = JSON.stringify(v, null, 2);
    dl.replaceChildren();
    const row = (k, node) => { const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.append(node); dl.append(dt, dd); };
    const text = (s) => document.createTextNode(String(s));
    const link = (href, s) => Object.assign(document.createElement('a'), { href, textContent: s });
    for (const [k, val] of Object.entries(v)) {
      if (k === 'commit' && /^[0-9a-f]{40}$/.test(val)) row(k, link(`${REPO}/commit/${val}`, val));
      else if (k === 'built') row(k, text(`${val} (${new Date(val).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} your time)`));
      else row(k, text(typeof val === 'object' ? JSON.stringify(val) : val));
    }
    document.getElementById('v').textContent = v.version;
  } catch (e) { raw.textContent = `Could not read version.json: ${e.message}`; }
})();
