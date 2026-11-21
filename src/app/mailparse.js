// The mail client's pure parts (no page access), so tests can run them: Gmail's message format
// decoded, the parts that hold the text and the attachments found, replies and forwards made,
// dates and senders shown. Message text is untrusted: the page shows HTML only in a sandboxed frame.
// By cell.email.b@AgentiCCells.dinis, 2026-11-21. Apache-2.0.

export function b64urlBytes(s) {
  const b = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b + '='.repeat((4 - (b.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function charsetOf(part) {
  const ct = header(part, 'Content-Type') || part.mimeType || '';
  return (ct.match(/charset="?([\w-]+)"?/i)?.[1] || 'utf-8').toLowerCase();
}
export function decodeText(data, charset = 'utf-8') {
  const bytes = b64urlBytes(data);
  try { return new TextDecoder(charset).decode(bytes); } catch { return new TextDecoder('utf-8').decode(bytes); }
}

export function header(msgOrPart, name) {
  const hs = msgOrPart?.payload?.headers || msgOrPart?.headers || [];
  const n = name.toLowerCase();
  return hs.find((h) => h.name.toLowerCase() === n)?.value || '';
}

// Walk the parts: the first text/plain, the first text/html, and every attachment.
export function partsOf(msg) {
  const out = { text: '', html: '', attachments: [] };
  const walk = (p) => {
    if (!p) return;
    const name = p.filename || '';
    if (name && p.body?.attachmentId) {
      out.attachments.push({ name, mimeType: p.mimeType || 'application/octet-stream', size: p.body.size || 0, id: p.body.attachmentId, inline: /^inline/i.test(header(p, 'Content-Disposition')), cid: header(p, 'Content-ID').replace(/[<>]/g, '') });
    } else if (p.mimeType === 'text/plain' && p.body?.data && !out.text) out.text = decodeText(p.body.data, charsetOf(p));
    else if (p.mimeType === 'text/html' && p.body?.data && !out.html) out.html = decodeText(p.body.data, charsetOf(p));
    for (const c of p.parts || []) walk(c);
  };
  walk(msg?.payload);
  return out;
}

// "Ana Silva <ana@example.com>" -> { name: 'Ana Silva', address: 'ana@example.com' }
export function parseAddress(s) {
  s = String(s || '').trim();
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim(), address: m[2].trim() };
  return { name: '', address: s };
}
// Split an address list on commas outside quotes.
export function splitAddresses(s) {
  const out = []; let cur = '', q = false, angle = false;
  for (const ch of String(s || '')) {
    if (ch === '"') q = !q;
    if (ch === '<') angle = true;
    if (ch === '>') angle = false;
    if (ch === ',' && !q && !angle) { if (cur.trim()) out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
export const displayName = (s) => { const a = parseAddress(s); return a.name || a.address.split('@')[0] || a.address; };

// List dates the way webmail does: the time today, "21 Nov" this year, "21/11/2025" before.
export function shortDate(ms, now = Date.now()) {
  const d = new Date(Number(ms)), n = new Date(now);
  if (d.toDateString() === n.toDateString()) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (d.getFullYear() === n.getFullYear()) return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
export const longDate = (ms) => new Date(Number(ms)).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export function size(n) { return n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`; }

// Text for quoting when the message has only HTML.
export function htmlToText(html) {
  return String(html || '').replace(/<(style|script)[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|tr|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n').trim();
}

// A reply, reply-all or forward of msg, by the person at me. Returns the compose fields.
export function respond(kind, msg, me) {
  const subject = header(msg, 'Subject');
  const from = header(msg, 'Reply-To') || header(msg, 'From');
  const mine = (a) => parseAddress(a).address.toLowerCase() === String(me).toLowerCase();
  const p = partsOf(msg);
  const body = p.text || htmlToText(p.html);
  const when = longDate(msg.internalDate);
  const msgId = header(msg, 'Message-ID') || header(msg, 'Message-Id');
  if (kind === 'forward') {
    return { to: '', cc: '', subject: /^fwd?:/i.test(subject) ? subject : `Fwd: ${subject}`, threadId: '', inReplyTo: '', references: '',
      text: `\n\n---------- Forwarded message ----------\nFrom: ${header(msg, 'From')}\nDate: ${when}\nSubject: ${subject}\nTo: ${header(msg, 'To')}\n\n${body}` };
  }
  let to = [from]; let cc = [];
  if (mine(header(msg, 'From'))) to = splitAddresses(header(msg, 'To'));
  if (kind === 'replyAll') {
    const seen = new Set(to.map((a) => parseAddress(a).address.toLowerCase()));
    for (const a of [...splitAddresses(header(msg, 'To')), ...splitAddresses(header(msg, 'Cc'))]) {
      const k = parseAddress(a).address.toLowerCase();
      if (!seen.has(k) && !mine(a)) { seen.add(k); cc.push(a); }
    }
  }
  const quoted = body.split('\n').map((l) => `> ${l}`).join('\n');
  return { to: to.join(', '), cc: cc.join(', '), subject: /^re:/i.test(subject) ? subject : `Re: ${subject}`, threadId: msg.threadId,
    inReplyTo: msgId, references: [header(msg, 'References'), msgId].filter(Boolean).join(' '),
    text: `\n\nOn ${when}, ${header(msg, 'From')} wrote:\n${quoted}` };
}

// The HTML shown in the sandboxed frame: the email's own HTML (or its text), with links opening
// in a new tab. The frame has no scripts and no same-origin access; the page's policy, which the
// frame inherits, blocks every remote image, font and request.
export function frameDoc(parts) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const content = parts.html || `<pre style="white-space:pre-wrap;font:inherit;margin:0">${esc(parts.text || '')}</pre>`;
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>body{margin:0;padding:4px 2px;font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#202124;overflow-wrap:anywhere}img{max-width:100%;height:auto}img[src^="http"],img[src^="//"]{display:none}blockquote{margin:0 0 0 .8ex;border-left:1px solid #ccc;padding-left:1ex}</style></head><body>${content}</body></html>`;
}
