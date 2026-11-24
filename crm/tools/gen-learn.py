# Builds the "Learn the CRM" pages in Site__Tool__CRM: the path (site/learn/path.json and /learn/), the overview
# By crm.dev.a@AgentiCCells.dinis, 2026-11-24. Apache-2.0. The deck folder is the slide files of the presentation artifact; the
# viewer (learn/viewer.js, learn/viewer.css) is copied in by hand. Safe to run again: it takes out what it added before.
# presentation as a static page (/learn/overview/, from the deck's slide files), and the learn bar on /how-to/.
# python3 -I gen-learn.py <deck folder> <shots folder> <site repo>
import json, os, re, sys, html
from PIL import Image

DECK, SHOTS, SITE = sys.argv[1], sys.argv[2], sys.argv[3]
S = os.path.join(SITE, 'site')
VIDEOS = '/learn/videos/'
STUDIO_SRC = sys.argv[4] if len(sys.argv) > 4 else None   # Site__Agent__CRM's a.crm.studio/videos folder, mirrored here
AGENTS = 'https://crm.agents.sovereignweb.site/factory/dinis-cruz/account-a/a.crm.studio/'
PATH = [
    {'title': 'The CRM in 13 slides', 'kind': 'presentation', 'url': '/learn/overview/', 'about': 'What the CRM is, what it does and how it keeps your contacts in your own vault.'},
    {'title': 'The CRM, and its demo', 'kind': 'video', 'url': VIDEOS + '01-what-it-is/', 'about': 'A walk through the demo: Today, the lead board, a company and its people.'},
    {'title': 'How to use the CRM', 'kind': 'guide', 'url': '/how-to/', 'about': 'Step by step: the demo, logging in, getting a vault, adding people, logging actions.'},
    {'title': 'Logging in, and the QR key hand-over', 'kind': 'video', 'url': VIDEOS + '06-log-in/', 'about': 'Log in on You, send your QR code, and drop the one you get back.'},
    {'title': 'Today, and logging an action', 'kind': 'video', 'url': VIDEOS + '02-today-and-actions/', 'about': 'An overdue company, a follow-up logged, and the next step set.'},
    {'title': 'Follow-ups', 'kind': 'video', 'url': VIDEOS + '03-follow-ups/', 'about': 'The 5-day rule: what puts a company on the list and what takes it off.'},
    {'title': 'Importing a spreadsheet', 'kind': 'video', 'url': VIDEOS + '04-import/', 'about': 'Bring your contacts in from a CSV file: what is matched, what is skipped.'},
    {'title': 'Verified keys on people', 'kind': 'video', 'url': VIDEOS + '07-verified-keys/', 'about': 'Add a contact\'s key from the QR code they sent, checked and signed for with yours.'},
    {'title': 'How the agents build the CRM in parallel', 'kind': 'video', 'url': VIDEOS + '05-agents-in-parallel/', 'about': 'Who builds what, in which repository, and how work moves between the agents.'},
    {'title': 'Open the CRM', 'kind': 'app', 'url': '/app/', 'about': 'Start in the demo, then log in on You.'},
]
WORD = dict(enumerate('zero one two three four five six seven eight nine ten eleven twelve'.split()))
KIND = {'presentation': 'Presentation', 'video': 'Video', 'guide': 'Guide', 'app': 'The app'}
BLOBS = {'202d8b712f2866d3c2c34f615020dc51': 'today', '2c9a91ea79ec4c2b6423628e295a44e5': 'board', '442481b77f5d1ba4891c67cddea9bb93': 'you',
         'f1df5c334c3b94dc327f5664df5a6b0e': 'people', '04a1e6ed75e1534c0b3a3f9ba02df952': 'key-preview', 'fe52ef184b0d504ccc6bf55b4c53cef7': 'log-preview',
         '4bdb9d77ac87a45af6da147bb370583a': 'phone', '6c440d7198799cc58cb88a87045e0939': 'today-dark', 'c8b7790250b3251ab3991ebe0c5dafca': 'followups',
         '37367b2a623fe837a1d2b78c4c6ebd5f': 'design-day', 'cd44dd6e8e6f22a2df899f340e30211c': 'design-board', '82780f7326ac34709b12ca7b262894b5': 'design-thread',
         '31f03a22cf2429a11bdea2b3ef4dbd88': 'design-map', '7ab737f38ba96400e9617096dd183823': 'design-ledger'}
SRC = {'today': 'c-today.jpg', 'board': 'c-board.jpg', 'you': 'c-you.jpg', 'people': 'c-people.jpg', 'key-preview': 'c-key-preview.jpg', 'log-preview': 'c-log-preview.jpg',
       'phone': 'c-phone.jpg', 'today-dark': 'c-today-dark.jpg', 'followups': 'c-followups.jpg', 'design-day': 'dz-day.jpg', 'design-board': 'dz-board.jpg',
       'design-thread': 'dz-thread.jpg', 'design-map': 'dz-map.jpg', 'design-ledger': 'dz-ledger.jpg'}

def learn_nav(i):
    """The bar on every step: where you are, the previous and next steps, and the whole path."""
    prev = PATH[i - 1] if i > 0 else None
    nxt = PATH[i + 1] if i + 1 < len(PATH) else None
    out = [f'<nav class="learn-nav" aria-label="Learn the CRM: step {i + 1} of {len(PATH)}">',
           f'<a class="learn-all" href="/learn/">Learn the CRM</a> <span class="learn-step">Step {i + 1} of {len(PATH)}</span>']
    out.append(f'<a class="learn-prev" rel="prev" href="{prev["url"]}">← {KIND[prev["kind"]]}: {html.escape(prev["title"])}</a>' if prev else '<span class="learn-prev"></span>')
    out.append(f'<a class="learn-next" rel="next" href="{nxt["url"]}">Next, {KIND[nxt["kind"]].lower()}: {html.escape(nxt["title"])} →</a>' if nxt else '')
    out.append('</nav>')
    return '\n'.join(out)

FRAME_LINK = '<link rel="stylesheet" href="/app/brand/site-frame.css">'  # a.crm.design's brand for the site's own pages
LEARN_CSS = """.learn-nav{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem 1.2rem;margin:2rem 0 1rem;padding:1rem 1.2rem;border:2px solid var(--accent);border-radius:12px;font-size:1rem}
.learn-nav a{color:var(--accent);font-weight:600;min-height:24px}
.learn-nav .learn-step{color:var(--muted)}
.learn-nav .learn-next{margin-left:auto;background:var(--accent);color:var(--bg);padding:.55rem 1rem;border-radius:999px;text-decoration:none}
.learn-nav .learn-prev{flex-basis:100%;order:3;font-weight:400}"""

# ---- the head and the frame, taken from /how-to/ so the site stays one site
howto_p = os.path.join(S, 'how-to', 'index.html')
howto = open(howto_p, encoding='utf-8').read()
# A second run starts from the page as the first run left it: take its learn bar and styles out first.
howto = re.sub(r'\n?<nav class="learn-nav".*?</nav>\n\n?', '\n', howto, flags=re.S)
howto = re.sub(r'\.learn-nav\{.*?\.learn-nav \.learn-prev\{[^}]*\}\n?', '', howto, flags=re.S)
head_end = howto.index('</head>')
body_start = howto.index('<body>') + len('<body>')
top_end = howto.index('<main id="main">')
frame_head, frame_top = howto[:head_end], howto[body_start:top_end]
OWN_NAV = '<nav class="own" aria-label="This site">\n    <a href="/app/">Open the CRM</a>\n    <a href="/learn/">Learn</a>\n    <a href="/how-to/">How to</a>\n    <a href="/start/">Start here</a>\n  </nav>'
frame_top = re.sub(r'<nav class="own" aria-label="This site">.*?</nav>', OWN_NAV, frame_top, flags=re.S)
foot = howto[howto.index('<footer>'):howto.index('</main>')]

def page(url, title, desc, main, extra_head='', main_attr=''):
    h = frame_head
    old_title = re.search(r'<title>(.*?)</title>', h).group(1)
    old_desc = re.search(r'<meta name="description" content="([^"]*)">', h).group(1)
    h = h.replace(old_title, html.escape(title)).replace(old_desc, html.escape(desc, quote=True)).replace('https://crm.tool.sovereignweb.site/how-to/', 'https://crm.tool.sovereignweb.site' + url)
    h = h.replace('</style>', LEARN_CSS + '\n</style>' + extra_head, 1)
    if FRAME_LINK not in h: h = h + FRAME_LINK + '\n'
    return f'{h}</head>\n<body>{frame_top}<main id="main"{main_attr}>\n{main}\n{foot}</main>\n</body>\n</html>\n'

# ---- /learn/path.json and /learn/
os.makedirs(os.path.join(S, 'learn', 'overview', 'img'), exist_ok=True)
json.dump({'schema': 'crm.learn-path/1', 'title': 'Learn the CRM', 'about': 'The order to read and watch: each step links to the previous and the next.',
           'steps': [{'n': i + 1, **p} for i, p in enumerate(PATH)]}, open(os.path.join(S, 'learn', 'path.json'), 'w'), indent=2, ensure_ascii=False)
items = '\n'.join(f'<li><a href="{p["url"]}"><strong>{html.escape(p["title"])}</strong></a> <span class="kind">{KIND[p["kind"]]}</span><br><span class="about">{html.escape(p["about"])}</span></li>' for p in PATH)
learn_main = f'''<div class="mark">Learn</div>
<h1>Learn the CRM</h1>
<p>{WORD[len(PATH)].capitalize()} steps, in order: a short presentation, {WORD[sum(p["kind"] == "video" for p in PATH)]} explainers, the guide, and then the CRM itself. Each one ends with a link to the next.</p>
<ol class="path">
{items}
</ol>
<p><a class="start" href="{PATH[0]["url"]}">Start with step 1 →</a></p>'''
learn_css = '<style>.path{padding-left:1.4rem}.path li{margin:1rem 0}.path .kind{font-size:.8rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-left:.4rem}.path .about{color:var(--muted)}.start{display:inline-block;background:var(--accent);color:var(--bg);font-weight:600;padding:.6rem 1.1rem;border-radius:999px;text-decoration:none}</style>'
open(os.path.join(S, 'learn', 'index.html'), 'w', encoding='utf-8').write(page('/learn/', 'Learn the CRM', f'Learn the SovereignWeb.site CRM in {WORD[len(PATH)]} steps: a short presentation, {WORD[sum(p["kind"] == "video" for p in PATH)]} explainers and the step-by-step guide, each linking to the next.', learn_main, learn_css))

# ---- /learn/overview/: the deck as a page
deck = json.load(open(os.path.join(DECK, 'project', 'deck.json')))
for blob, name in BLOBS.items():
    im = Image.open(os.path.join(SHOTS, SRC[name])).convert('RGB')
    w = 700 if name == 'phone' else 1800
    if im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(os.path.join(S, 'learn', 'overview', 'img', name + '.jpg'), quality=80, optimize=True, progressive=True)
slides = []
for sid in deck['order']:
    t = open(os.path.join(DECK, 'project', 'slides', sid + '.html'), encoding='utf-8').read()
    for blob, name in BLOBS.items(): t = t.replace('/_blob/' + blob, 'img/' + name + '.jpg')
    t = t.replace('/_blob/6fefe5fff8e80c9547ecec37224bee61', '/app/brand/mark.svg')
    t = re.sub(r'<x-icon[^>]*></x-icon>\s*', '', t)
    t = re.sub(r'<aside>(.*?)</aside>', r'<aside class="notes">\1</aside>', t, flags=re.S)
    t = re.sub(r'<section id="([^"]+)"(?: class="([^"]*)")?', lambda m: '<section id="%s" class="%s"' % (m.group(1), ('slide ' + (m.group(2) or '')).strip()), t, count=1)
    slides.append(t)
deck_css = open(os.path.join(DECK, 'project', 'deck.css'), encoding='utf-8').read()
deck_css = deck_css.replace("'Literata', Georgia, serif", "Charter, 'Iowan Old Style', Georgia, serif").replace("'Inter', Arial, sans-serif", "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif")
def scope(css):
    # Put '.deck ' in front of every selector of every plain rule, so the slides' rules never reach the page around them.
    out, i = [], 0
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    while i < len(css):
        j = css.find('{', i)
        if j < 0: out.append(css[i:]); break
        sel = css[i:j].strip()
        if sel.startswith('@keyframes') or sel.startswith('@font-face'):
            depth, k = 0, j
            while True:
                if css[k] == '{': depth += 1
                elif css[k] == '}':
                    depth -= 1
                    if depth == 0: break
                k += 1
            out.append(css[i:k + 1] + '\n'); i = k + 1; continue
        k = css.index('}', j)
        if sel == ':root': new_sel = '.deck'
        elif sel == 'body': new_sel = '.deck'
        else: new_sel = ', '.join('.deck ' + x.strip() if not x.strip().startswith('section') else '.deck > ' + x.strip() for x in sel.split(','))
        out.append(new_sel + ' ' + css[j:k + 1] + '\n'); i = k + 1
    return ''.join(out)
open(os.path.join(S, 'learn', 'overview', 'deck.css'), 'w', encoding='utf-8').write(
    '/* The slides\' own rules, from the presentation "SovereignWeb.site CRM" (24 Nov 2026), scoped to the deck. */\n' + scope(deck_css))
n = len(slides)
viewer = f'''<div class="mark">Presentation</div>
<h1>The CRM in {n} slides</h1>
<p>What the CRM is and what it does, made from its demo: every company and person in it is made up. Use the arrow keys, or the buttons. <a href="#" id="pdf">Save as PDF</a> prints one slide per page.</p>
<div class="deck-frame"><div class="deck" id="deck" tabindex="0" role="region" aria-roledescription="slide deck" aria-label="The CRM in {n} slides">
{chr(10).join(slides)}
</div></div>
<div class="deck-controls">
<button type="button" id="prev">← Previous</button>
<span id="count" aria-live="polite">1 / {n}</span>
<button type="button" id="next">Next →</button>
<button type="button" id="full" class="quiet">Full screen</button>
</div>
{learn_nav(0)}'''
viewer_head = '''<link rel="stylesheet" href="deck.css">
<link rel="stylesheet" href="viewer.css">
<script src="viewer.js" defer></script>'''
open(os.path.join(S, 'learn', 'overview', 'index.html'), 'w', encoding='utf-8').write(
    page('/learn/overview/', 'The CRM in 13 slides', 'A short presentation of the SovereignWeb.site CRM: Today, the lead board, logging actions, follow-ups, many small CRMs, QR handover and verified keys.', viewer, viewer_head, ' class="wide"'))

# ---- the learn bar on /how-to/ (step 3), above its footer; replaced on each run
i = next(k for k, p in enumerate(PATH) if p['url'] == '/how-to/')
howto = re.sub(r'<nav class="own" aria-label="This site">.*?</nav>', OWN_NAV, howto, count=1, flags=re.S)
howto = howto.replace('</style>', LEARN_CSS + '\n</style>' + ('' if FRAME_LINK in howto else '\n' + FRAME_LINK), 1).replace('\n<footer>', '\n' + learn_nav(i) + '\n\n<footer>', 1)
open(howto_p, 'w', encoding='utf-8').write(howto)

# ---- /learn/videos/: a.crm.studio's explainers, mirrored from Site__Agent__CRM so the team has them on the tool's own site.
# The pages are the studio's, unchanged but for their own address, the site header and the learn bar.
if STUDIO_SRC:
    import shutil
    dst = os.path.join(S, 'learn', 'videos')
    if os.path.isdir(dst): shutil.rmtree(dst)
    shutil.copytree(STUDIO_SRC, dst)
    TOP = '<header class="sws-top" style="display:flex;flex-wrap:wrap;gap:.4rem 1.2rem;align-items:center;max-width:72rem;margin:0 auto;padding:1rem 1rem 0;font-size:1rem"><a href="/" style="font-weight:700;color:inherit;text-decoration:none">CRM</a><nav aria-label="This site" style="display:flex;flex-wrap:wrap;gap:1rem;margin-left:auto"><a href="/app/" style="font-weight:600">Open the CRM</a><a href="/learn/" style="font-weight:600">Learn</a><a href="/how-to/" style="font-weight:600">How to</a></nav></header>'
    NAVCSS = '<style>:root{--accent:#1f5446;--bg:#fbfaf7;--muted:#5b6460}@media (prefers-color-scheme:dark){:root{--accent:#7cc4ab;--bg:#121513;--muted:#a3aca7}}' + LEARN_CSS.replace('\n', '') + '</style>'
    for root, dirs, files in os.walk(dst):
        for f in files:
            if not f.endswith('.html'): continue
            fp = os.path.join(root, f); h = open(fp, encoding='utf-8').read()
            rel = os.path.relpath(root, dst).replace(os.sep, '/'); rel = '' if rel == '.' else rel + '/'
            here = VIDEOS + rel
            h = h.replace(AGENTS + 'videos/' + rel, 'https://crm.tool.sovereignweb.site' + here).replace(AGENTS + 'videos/', 'https://crm.tool.sovereignweb.site' + VIDEOS)
            h = h.replace('href="../agent.json"', 'href="' + AGENTS + 'agent.json"').replace('href="../now.md"', 'href="' + AGENTS + 'now.md"')
            h = h.replace('https://crm.tool.sovereignweb.site/how-to/', '/how-to/')
            if '<header class="site">' in h and 'class="learn"' in h:
                # The studio's own header and learning bar are there (since Site__Agent__CRM c7aef99): keep them, add nothing.
                h = re.sub(r'(href|data-next-href)="https://crm\.tool\.sovereignweb\.site/(app|learn)/', r'\1="/\2/', h)
                h = h.replace('<link rel="canonical" href="/learn/', '<link rel="canonical" href="https://crm.tool.sovereignweb.site/learn/')
                open(fp, 'w', encoding='utf-8').write(h); continue
            h = h.replace('</head>', NAVCSS + '\n</head>', 1)
            if '<header class="site">' not in h: h = h.replace('<body>', '<body>\n' + TOP, 1)
            k = next((j for j, p in enumerate(PATH) if p['url'] == here), None)
            bar = learn_nav(k) if k is not None else '<nav class="learn-nav" aria-label="Learn the CRM"><a class="learn-all" href="/learn/">Learn the CRM</a> <span class="learn-step">All the steps, in order</span><a class="learn-next" href="' + PATH[0]['url'] + '">Start with step 1 →</a></nav>'
            h = h.replace('<footer>', bar + '\n<footer>', 1)
            open(fp, 'w', encoding='utf-8').write(h)
print('learn pages written;', n, 'slides')
