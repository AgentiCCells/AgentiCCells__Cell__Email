// Build: copy src/ to _site/, stamp the version, write version.json.
// SITE_VERSION is set by CI only (v0.1.N); a local build says "dev".
import { cpSync, rmSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname, relative, posix } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';
import { markdown, page } from './md.mjs';
const version = process.env.SITE_VERSION || 'dev';
rmSync('_site', { recursive: true, force: true });
cpSync('src', '_site', { recursive: true });
// cell.email@AgentiCCells.dinis, 2026-11-16: the plan (docs/plan/*.md) and the Agent
// Behaviour Policy (abp/*.md) are published as HTML pages, with their Markdown beside them.
// Repository path -> site path: docs/plan/x.md -> plan/x.html, abp/x.md -> abp/x.html.
// docs/pages/x.md -> x.html at the site root (the privacy policy).
const PAGES = [['docs/plan', 'plan'], ['abp', 'abp'], ['docs/pages', ''], ['src', '']]; // src/ holds no .md; listed so links to its pages map to the site
const sitePathOf = (repoPath) => { for (const [from, to] of PAGES) if (repoPath.startsWith(from + '/')) return posix.join(to, repoPath.slice(from.length + 1)).replace(/\.md$/, '.html'); return null; };
const GITHUB = 'https://github.com/AgentiCCells/AgentiCCells__Cell__Email/blob/dev/';
for (const [from] of PAGES) {
  if (!existsSync(from)) continue;
  for (const f of readdirSync(from).filter((n) => n.endsWith('.md'))) {
    const repoPath = posix.join(from, f);
    const out = sitePathOf(repoPath);
    const mapLink = (href) => {
      if (/^(https?:|mailto:|#)/.test(href)) return href;
      const [path, hash] = href.split('#');
      const target = posix.normalize(posix.join(posix.dirname(repoPath), path));
      const site = sitePathOf(target);
      const url = site ? posix.relative(posix.dirname(out), site) : GITHUB + target;
      return hash ? `${url}#${hash}` : url;
    };
    const src = readFileSync(repoPath, 'utf8');
    const { html, title, description } = markdown(src, mapLink);
    const up = posix.relative(posix.dirname(out), 'index.html');
    const crumbs = `<a href="${up}">Email AgenticCell</a>` + (out.startsWith('plan/') && f !== 'index.md' ? ` / <a href="index.html">The plan</a>` : '');
    mkdirSync(join('_site', dirname(out)), { recursive: true });
    writeFileSync(join('_site', out), page({ title, description, body: html, crumbs, sourcePath: repoPath, mdName: f }));
    writeFileSync(join('_site', dirname(out), f), src);
  }
}
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
for (const f of walk('_site')) {
  if (!/\.(html|js|css|json|md|txt)$/.test(f)) continue;
  const s = readFileSync(f, 'utf8');
  if (s.includes('__VERSION__')) writeFileSync(f, s.replaceAll('__VERSION__', version));
}
writeFileSync('_site/version.json', JSON.stringify({ version, commit: process.env.GITHUB_SHA || 'local', built: new Date().toISOString() }, null, 2) + '\n');
writeFileSync('_site/.nojekyll', '');
console.log(`built _site/ (${version})`);
