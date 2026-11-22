// Draw the workflow machines (sim/workflows/machines.mjs): a Markdown page for the plan, and
// SVG diagrams. PROPOSAL, by email.workflows.d@AgentiCCells.dinis, 22 November 2026. Dinis,
// about 04:08 UTC: "visualization and sort of graphing of all these is super important" and
// "these workflows are becoming the paths that we then visualize". Node built-ins only. Apache-2.0.
//
//   node sim/workflows/render.mjs            writes docs/plan/workflow-machines.md
//   node sim/workflows/render.mjs --html F   also writes a page of SVG diagrams to F
import { writeFileSync } from 'node:fs';
import { MACHINES, PRIMITIVES, checkMachines, paths } from './machines.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const label = (s) => s.replace(/_/g, ' ');

// Columns by distance from the start state, so the diagram reads left to right.
function layout(m) {
  const names = Object.keys(m.states), depth = { [names[0]]: 0 }, todo = [names[0]];
  while (todo.length) { const s = todo.shift(); for (const mv of m.moves) if (mv.from === s && depth[mv.to] === undefined) { depth[mv.to] = depth[s] + 1; todo.push(mv.to); } }
  const cols = [];
  for (const s of names) (cols[depth[s] ?? 0] ||= []).push(s);
  const W = 140, H = 40, GX = 110, GY = 34, pos = {};
  cols.forEach((col, x) => col.forEach((s, y) => { pos[s] = { x: 20 + x * (W + GX), y: 20 + y * (H + GY), w: W, h: H }; }));
  const width = 40 + cols.length * (W + GX) - GX, height = 40 + Math.max(...cols.map((c) => c.length)) * (H + GY) - GY;
  return { pos, width, height };
}

export function svg(m) {
  const { pos, width, height } = layout(m);
  const parts = [];
  m.moves.forEach((mv, i) => {
    const a = pos[mv.from], b = pos[mv.to];
    const back = b.x <= a.x;
    const x1 = back ? a.x + a.w / 2 : a.x + a.w, y1 = back ? a.y : a.y + a.h / 2;
    const x2 = back ? b.x + b.w / 2 : b.x, y2 = back ? b.y : b.y + b.h / 2;
    const cx = back ? (x1 + x2) / 2 : (x1 + x2) / 2, cy = back ? Math.min(y1, y2) - 30 : (y1 + y2) / 2;
    const d = back ? `M${x1},${y1} Q${cx},${cy} ${x2},${y2}` : `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`;
    parts.push(`<path d="${d}" class="mv mv-${mv.by}" marker-end="url(#arrow)"><title>${esc(`${mv.on} (by ${mv.by}${mv.check ? `; checked by ${mv.check}` : ''}${mv.uses ? `; the workflow ${mv.uses}` : ''})`)}</title></path>`);
    const lx = back ? cx : (x1 + x2) / 2, ly = (back ? cy + 4 : (y1 + y2) / 2 - 5) + (i % 2 ? 10 : 0);
    parts.push(`<text x="${lx}" y="${ly}" class="ev">${esc(mv.uses ? `⟦${mv.uses}⟧` : mv.on.length > 20 ? mv.on.slice(0, 19) + '…' : mv.on)}</text>`);
  });
  for (const [s, p] of Object.entries(pos)) {
    const end = m.states[s].end;
    parts.push(`<g class="st ${end ? `end-${end}` : ''}"><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${end ? 22 : 6}"><title>${esc(m.states[s].about)}</title></rect><text x="${p.x + p.w / 2}" y="${p.y + p.h / 2 + 4}">${esc(label(s))}</text></g>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height + 20}" viewBox="0 0 ${width} ${height + 20}" role="img" aria-label="${esc(m.title)}"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="head"/></marker></defs>${parts.join('')}</svg>`;
}

export function markdownPage(machines = MACHINES) {
  const problems = checkMachines(machines);
  const L = [];
  L.push('# The workflow machines', '');
  L.push('**Status: a proposal, generated** from `sim/workflows/machines.mjs` by `node sim/workflows/render.mjs`; do not edit by hand. Written by email.workflows.d@AgentiCCells.dinis at Dinis\'s word, 22 November 2026, about 04:08 UTC: "I want you to think in terms of state machines, and I want you to think about every action that happens here is actually a workflow". Each machine says whether it is built (in the page today), simulation (code and tests with made-up data) or plan. [The workflows page](workflows.md). [Back to the plan](index.md).', '');
  L.push(`Machines: ${machines.length}. Structure check: ${problems.length ? problems.join('; ') : 'every state can be reached, every non-end state has a way out, every goal can be reached, no workflow uses itself'}.`, '');
  const ranked = [...machines].sort((a, b) => (b.bottleneck || 0) - (a.bottleneck || 0) || a.level - b.level);
  L.push('## The map, ranked by the sending bottleneck', '');
  L.push('Ranked by how much each workflow removes the bottleneck Dinis named on 22 November (about 04:04 UTC, in email.pm.d\'s session): sending email. 5 removes the most. The rank is this agent\'s judgement, a proposal.', '');
  L.push('| Rank | Workflow | Status | Trigger | Needs | Who approves | What is signed | Acceptance check |', '|---|---|---|---|---|---|---|---|');
  for (const m of ranked) L.push(`| ${m.bottleneck} | **${m.id}**: ${m.title} | ${m.status} | ${m.trigger} | ${m.needs} | ${m.approves} | ${m.signed} | ${m.acceptance} |`);
  L.push('');
  L.push('## Building blocks against workflows', '');
  L.push('Which of the primitives we have each workflow uses. A workflow can run only when every block it uses is built.', '');
  const keys = Object.keys(PRIMITIVES);
  L.push(`| Workflow | ${keys.join(' | ')} |`, `|---|${keys.map(() => '---').join('|')}|`);
  for (const m of ranked) L.push(`| ${m.id} | ${keys.map((k) => (m.primitives?.includes(k) ? 'x' : '')).join(' | ')} |`);
  L.push('');
  L.push('| Block | What it is | Status |', '|---|---|---|');
  for (const [k, v] of Object.entries(PRIMITIVES)) L.push(`| ${k} | ${v.name} | ${v.status} |`);
  L.push('');
  L.push('## Workflows of workflows', '');
  L.push('| Level | Workflow | Goal (its end state) | Uses | Scales by |', '|---|---|---|---|---|');
  for (const m of machines) {
    const uses = [...new Set(m.moves.map((x) => x.uses).filter(Boolean))].join(', ') || 'none';
    L.push(`| ${m.level} | **${m.id}** | ${m.goal} | ${uses} | ${m.product.scale} |`);
  }
  L.push('');
  for (const m of machines) {
    L.push(`## ${m.id}: ${m.title}`, '');
    L.push(`- **Goal:** ${m.goal}`, `- **Status:** ${m.status}${m.code ? ` (\`${m.code}\`)` : ''}`, `- **Trigger:** ${m.trigger}`, `- **Needs:** ${m.needs}`, `- **Approves:** ${m.approves}`, `- **Signed:** ${m.signed}`, `- **Acceptance:** ${m.acceptance}`, `- **Bottleneck rank:** ${m.bottleneck}; **uses:** ${(m.primitives || []).join(', ')}`, `- **As a product:** for ${m.product.for}. Scale: ${m.product.scale}`, '');
    L.push('| State | What it means | End |', '|---|---|---|');
    for (const [s, v] of Object.entries(m.states)) L.push(`| ${s} | ${v.about} | ${v.end || ''} |`);
    L.push('', 'Paths from the start to an end:', '', '```');
    for (const p of paths(m)) L.push(`${p.kind.padEnd(4)}  ${p.states.join(' > ')}`);
    L.push('```', '');
    L.push('| From | Event | To | By | Checked by | Workflow |', '|---|---|---|---|---|---|');
    for (const mv of m.moves) L.push(`| ${mv.from} | ${mv.on} | ${mv.to} | ${mv.by} | ${mv.check ? `\`${mv.check}\`` : ''} | ${mv.uses || ''} |`);
    L.push('');
  }
  return L.join('\n');
}

export function htmlPage(machines = MACHINES) {
  const css = `:root{--bg:#fbfaf7;--fg:#1d1d1b;--muted:#6b6a65;--line:#9a988f;--box:#fff;--goal:#e3f1e5;--stop:#f6e3e0;--person:#2f6fb0;--agent:#8a5a00;--page:#4b4b47;--google:#a33;--vault:#2f7d4a}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#171716;--fg:#eceae4;--muted:#a19f98;--line:#77756e;--box:#22221f;--goal:#1f3324;--stop:#3a2320;--person:#7fb0e6;--agent:#e0b25a;--page:#bdbbb3;--google:#e88;--vault:#7cc796}}
:root[data-theme="dark"]{--bg:#171716;--fg:#eceae4;--muted:#a19f98;--line:#77756e;--box:#22221f;--goal:#1f3324;--stop:#3a2320;--person:#7fb0e6;--agent:#e0b25a;--page:#bdbbb3;--google:#e88;--vault:#7cc796}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}main{max-width:1100px;margin:0 auto;padding:24px 16px}
h1{font-size:1.6rem;margin:0 0 4px}h2{font-size:1.15rem;margin:32px 0 4px}p{margin:4px 0 8px;color:var(--muted)}
.fig{overflow-x:auto;border:1px solid var(--line);border-radius:8px;background:var(--box);padding:8px}svg{display:block;max-width:none}
.st rect{fill:var(--box);stroke:var(--line);stroke-width:1.2}.st text{fill:var(--fg);font-size:12px;text-anchor:middle}.end-goal rect{fill:var(--goal)}.end-stop rect{fill:var(--stop)}
.mv{fill:none;stroke:var(--line);stroke-width:1.4}.head{fill:var(--line)}.ev{fill:var(--muted);font-size:10px;text-anchor:middle}
.mv-person{stroke:var(--person)}.mv-agent{stroke:var(--agent);stroke-dasharray:5 3}.mv-google{stroke:var(--google)}.mv-vault{stroke:var(--vault)}.mv-page{stroke:var(--page)}
.key span{display:inline-block;margin-right:14px;font-size:13px}.key i{display:inline-block;width:18px;height:3px;vertical-align:middle;margin-right:4px}
.tag{display:inline-block;font-size:12px;padding:0 6px;border-radius:4px;border:1px solid var(--line);margin-left:6px;color:var(--muted)}`;
  const key = `<p class="key"><span><i style="background:var(--person)"></i>person</span><span><i style="background:var(--agent)"></i>agent</span><span><i style="background:var(--page)"></i>page</span><span><i style="background:var(--google)"></i>Google</span><span><i style="background:var(--vault)"></i>vault</span><span>green: the goal; red: a stop; ⟦name⟧: a whole workflow inside this one</span></p>`;
  const body = machines.map((m) => `<section><h2>${esc(m.id)}: ${esc(m.title)} <span class="tag">level ${m.level}</span><span class="tag">${esc(m.status)}</span></h2><p><strong>Goal:</strong> ${esc(m.goal)}. <strong>Approves:</strong> ${esc(m.approves)}. <strong>Bottleneck rank:</strong> ${m.bottleneck}. <strong>Scales by:</strong> ${esc(m.product.scale)}</p><div class="fig">${svg(m)}</div></section>`).join('\n');
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email workflow machines</title><style>${css}</style></head><body><main><h1>Email workflow machines</h1><p>A proposal by email.workflows.d@AgentiCCells.dinis, 22 November 2026, generated from sim/workflows/machines.mjs. Every action is a workflow; workflows use workflows. Hover a state or a move for its detail.</p>${key}${body}</main></body></html>\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = new URL('../../', import.meta.url).pathname;
  writeFileSync(root + 'docs/plan/workflow-machines.md', markdownPage());
  const i = process.argv.indexOf('--html');
  if (i > 0) writeFileSync(process.argv[i + 1], htmlPage());
  console.log('wrote docs/plan/workflow-machines.md' + (i > 0 ? ` and ${process.argv[i + 1]}` : ''));
}
