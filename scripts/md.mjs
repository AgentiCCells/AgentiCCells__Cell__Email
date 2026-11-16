// A small Markdown to HTML converter for the plan pages and the ABP, Node built-ins only.
// It handles what those pages use: headings, paragraphs, lists, tables, code blocks,
// inline code, bold, italics and links. Relative links to other .md files are mapped to
// their published .html pages by the caller's mapLink.
// Written by cell.email@AgentiCCells.dinis, 2026-11-16. Apache-2.0.
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function inline(s, mapLink) {
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(`<code>${esc(c)}</code>`); return `\u0000${codes.length - 1}\u0000`; });
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, href) => `<a href="${esc(mapLink(href.replace(/&amp;/g, '&')))}">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?=[^*\w]|$)/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)]);
}

export function markdown(src, mapLink = (h) => h) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let title = null, description = null;
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      if (level === 1 && !title) title = h[2].replace(/[*`]/g, '');
      const id = h[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      out.push(`<h${level} id="${id}">${inline(h[2], mapLink)}</h${level}>`);
      i++; continue;
    }
    if (/^\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      out.push('<div class="table"><table><thead><tr>' + head.map((c) => `<th>${inline(c, mapLink)}</th>`).join('') + '</tr></thead><tbody>'
        + body.map((r) => '<tr>' + r.map((c) => `<td>${inline(c, mapLink)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>');
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        let item = lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, '');
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i])) item += ' ' + lines[i++].trim();
        items.push(`<li>${inline(item, mapLink)}</li>`);
      }
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }
    if (!line.trim()) { i++; continue; }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|\||\s*([-*]|\d+\.)\s+)/.test(lines[i])) buf.push(lines[i++]);
    const para = buf.join(' ');
    if (!description) description = para.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*`]/g, '').slice(0, 240);
    out.push(`<p>${inline(para, mapLink)}</p>`);
  }
  return { html: out.join('\n'), title: title || 'Untitled', description: description || title || '' };
}

export const STYLE = `:root{--bg:#fbf7f0;--fg:#222;--muted:#666;--line:#ddd2c0;--box:#fff;--accent:#8a4b12}
@media(prefers-color-scheme:dark){:root{--bg:#17140f;--fg:#eee;--muted:#aaa;--line:#3b342a;--box:#211d17;--accent:#e9a866}}
*{box-sizing:border-box}
body{margin:0;font:17px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--bg);color:var(--fg)}
main{max-width:52rem;margin:0 auto;padding:2.5rem 1rem}
h1{font-size:1.9rem;line-height:1.2}
h2{font-size:1.3rem;margin-top:2.2rem;border-bottom:1px solid var(--line);padding-bottom:.3rem}
a{color:var(--accent)}
code{font:14px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:var(--box);border:1px solid var(--line);border-radius:3px;padding:0 .2rem}
pre{background:var(--box);border:1px solid var(--line);border-radius:6px;padding:1rem;overflow-x:auto}
pre code{border:0;padding:0;background:none}
.table{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:.92rem;margin:1rem 0}
th,td{border:1px solid var(--line);padding:.35rem .5rem;text-align:left;vertical-align:top}
th{background:var(--box)}
nav.crumbs{font-size:.9rem;color:var(--muted)}
footer{margin-top:3rem;border-top:1px solid var(--line);padding-top:1rem;color:var(--muted);font-size:.9rem}`;

export function page({ title, description, body, crumbs, sourcePath, mdName }) {
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="/assets/logo.svg" type="image/svg+xml">
<title>${esc(title)} · Email AgenticCell</title>
<meta name="description" content="${esc(description)}">
<style>
${STYLE}
</style>
</head>
<body>
<main>
<nav class="crumbs">${crumbs}</nav>
${body}
<footer>Version __VERSION__ · Source: <a href="https://github.com/AgentiCCells/AgentiCCells__Cell__Email/blob/dev/${sourcePath}">${sourcePath}</a> · <a href="${mdName}">Markdown</a> · Code Apache-2.0, text CC BY 4.0.</footer>
</main>
</body>
</html>
`;
}
