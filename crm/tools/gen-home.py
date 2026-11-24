# The CRM tool site's home page: what it is, the screenshot, the features with their explainers, how the data stays
# yours, and the whole learn path, built from site/learn/path.json so it never drifts from it.
# python3 -I gen-home.py <Site__Tool__CRM checkout>   By crm.dev.a@AgentiCCells.dinis, 2026-11-24. Apache-2.0.
import html, json, os, re, sys
SITE = sys.argv[1]; S = os.path.join(SITE, 'site')
p = os.path.join(S, 'index.html'); page = open(p, encoding='utf-8').read()
path = json.load(open(os.path.join(S, 'learn', 'path.json'), encoding='utf-8'))['steps']
by_url = {s['url']: s for s in path}
W = dict(enumerate('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split()))
n_steps, n_videos = len(path), sum(s['kind'] == 'video' for s in path)
e = html.escape
V = '/learn/videos/'

FEATURES = [  # (title, what it does, explainer slug)
    ('Today', 'One line per company that needs you: overdue first, then no reply for 5 days, then drafts to review. One button each.', '02-today-and-actions'),
    ('Follow-ups', 'A company comes back to you 5 days after your last email, until they answer; before you nudge again, it tells you when you last did.', '03-follow-ups'),
    ('Outbox, signed by you', 'Write an email on a company page and sign it off with your own key; the Email Cell sends only what you signed.', '09-outbox'),
    ('Many small CRMs', 'A personal one, one per team, one per project: each its own encrypted vault, with its own keys.', '06-log-in'),
    ('QR key hand-over', 'Log in with your passkey, send your QR code, drop the one you get back: the vault opens, in your browser only.', '06-log-in'),
    ('Verified keys', 'Add the key a contact gave you, checked and signed for with yours. Every view checks it again.', '07-verified-keys'),
    ('For you', 'Questions from the agents, sealed to your key, answered on the site with a signature, not lost in a chat.', '10-for-you'),
    ('Import a spreadsheet', 'Paste a CSV: companies matched by domain, people by email, nothing guessed, shown before it is written.', '04-import'),
]

def feature(t, d, slug):
    u = V + slug + '/'
    return f'''<li class="feat"><h3>{e(t)}</h3><p>{e(d)}</p><a href="{u}">Watch how <span class="visually-hidden">({e(t)})</span>→</a></li>'''

def step(s):
    if s['kind'] == 'video':
        slug = s['url'].rstrip('/').split('/')[-1]
        img = f'<img src="{V}{slug}/share.jpg" alt="" width="1200" height="630" loading="lazy">'
    elif s['kind'] == 'presentation':
        img = '<img src="/learn/overview/img/today.jpg" alt="" width="1800" height="1125" loading="lazy">'
    else:
        img = ''
    kind = {'video': 'Explainer', 'presentation': 'Presentation', 'guide': 'Guide', 'app': 'The app'}[s['kind']]
    return f'''<li class="step{' noimg' if not img else ''}"><a href="{s['url']}">{img}<span class="n">{s['n']}</span><span class="k">{kind}</span><strong>{e(s['title'])}</strong></a></li>'''

main = f'''<main id="main" class="home">
<section class="hero">
<div class="hero-text">
<div class="mark">SovereignWeb.site CRM</div>
<h1>Many small CRMs, each in its own encrypted vault</h1>
<p class="lede">Companies, people, every action taken with them, and what needs you today. It runs in your browser and opens your vault with your own keys: this site never sees your contacts.</p>
<p class="cta"><a class="btn" href="/app/">Try the demo</a> <a class="btn quiet" href="/learn/">Learn it in {W[n_steps]} steps</a></p>
<p class="small">No sign-up. The demo is made up, at reserved example domains; nothing you do there is written anywhere.</p>
</div>
<figure class="hero-shot"><img src="/assets/home-today.jpg" alt="The CRM's Today page: one line per company, overdue first, each with its next step and one button" width="1800" height="1125"></figure>
</section>

<section>
<h2>What it does</h2>
<ul class="feats">
{chr(10).join(feature(*f) for f in FEATURES)}
</ul>
</section>

<section class="yours">
<h2>Your contacts stay yours</h2>
<ul class="three">
<li><h3>An encrypted vault per CRM</h3><p>Every company, person, action and key is a file in a small sgit vault. The vault service holds only encrypted bytes.</p></li>
<li><h3>Your keys, in your browser</h3><p>Your browser makes its own key pair, behind your passkey. Its private half cannot leave the browser, not even to this page.</p></li>
<li><h3>A static site, nothing else</h3><p>No server code, no cookies, no tracking, no database. Every change is shown to you before it is written.</p></li>
</ul>
</section>

<section>
<h2>Learn it, one step after another</h2>
<p>A short presentation, {W[n_videos]} explainers that play in your browser with a synthetic presenter, and the guide. Each ends with a link to the next.</p>
<ol class="steps">
{chr(10).join(step(s) for s in path)}
</ol>
<p class="cta"><a class="btn" href="{path[0]['url']}">Start with the presentation</a> <a class="btn quiet" href="/how-to/">Or read the guide</a></p>
</section>

<section class="built">
<h2>Built in the open, by agents</h2>
<p>A developer agent, a design agent and a studio agent build this CRM in parallel, each in its own repository, with Dinis Cruz deciding. <a href="{V}05-agents-in-parallel/">Watch how they work together</a>, meet them on <a href="https://crm.agents.sovereignweb.site/">crm.agents.sovereignweb.site</a>, or <a href="/app/send/">ask the CRM's agent for something</a>.</p>
<p class="small">This site was made by one request to the Sovereign Website pipeline. Its files, its history and its address are in a repository its owner controls, and can move anywhere.</p>
</section>

'''
CSS = '''<style id="home-css">
main.home{max-width:72rem}
.top{max-width:72rem}
.home section{margin:3.5rem 0}
.home h2{font-size:clamp(1.5rem,3.5vw,2rem);margin:0 0 1rem}
.home h3{font-size:1.05rem;margin:0 0 .35rem;color:var(--fg)}
.home .small{font-size:.9rem}
.hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:2.5rem;align-items:center;margin-top:1rem!important}
.hero h1{font-size:clamp(2rem,5vw,3.2rem);line-height:1.08;margin:.4rem 0 1rem}
.lede{font-size:1.15rem}
.hero-shot{margin:0}
.hero-shot img,.steps img{display:block;width:100%;height:auto;border-radius:12px;border:1px solid var(--line);box-shadow:0 18px 50px rgba(0,0,0,.14)}
.cta{display:flex;flex-wrap:wrap;gap:.75rem;margin:1.4rem 0 .6rem}
.btn{display:inline-flex;align-items:center;min-height:44px;padding:.5rem 1.2rem;border-radius:999px;background:var(--accent);color:var(--bg)!important;font-weight:600;text-decoration:none;border:2px solid var(--accent)}
.btn.quiet{background:transparent;color:var(--accent)!important}
.feats,.three,.steps{list-style:none;padding:0;margin:0;display:grid;gap:1rem}
.feats{grid-template-columns:repeat(auto-fill,minmax(16rem,1fr))}
.feat,.three li{border:1px solid var(--line);border-radius:12px;padding:1.1rem 1.2rem;display:flex;flex-direction:column}
.feat p,.three p{margin:0 0 .8rem;flex:1}
.feat a{font-weight:600;min-height:44px;display:inline-flex;align-items:center}
.three{grid-template-columns:repeat(auto-fit,minmax(15rem,1fr))}
.yours{background:rgba(127,127,127,.06);border-radius:16px;padding:1.6rem}
.steps{grid-template-columns:repeat(auto-fill,minmax(13rem,1fr))}
.step a{display:flex;flex-direction:column;gap:.3rem;text-decoration:none;color:var(--fg);height:100%;padding-bottom:.4rem}
.step img{box-shadow:none;aspect-ratio:1200/630;object-fit:cover}
.step .n{font-size:.8rem;color:var(--accent);font-weight:700;margin-top:.3rem}
.step .k{font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.step strong{line-height:1.3}
.step.noimg a{justify-content:center;border:2px solid var(--accent);border-radius:12px;padding:1rem;min-height:8rem}
.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (max-width:52rem){.hero{grid-template-columns:1fr}}
</style>'''
page = re.sub(r'<main id="main"[^>]*>.*?(?=<footer>)', main, page, count=1, flags=re.S)
page = re.sub(r'\n?<style id="home-css">.*?</style>', '', page, flags=re.S)
page = page.replace('<link rel="stylesheet" href="/app/brand/site-frame.css">', '<link rel="stylesheet" href="/app/brand/site-frame.css">\n' + CSS, 1)
desc = 'The SovereignWeb.site CRM: many small CRMs, each in its own encrypted vault, opened in your browser with your own keys. Today, follow-ups, a signed outbox and verified keys; a demo and explainers.'
page = re.sub(r'(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*', lambda m: m.group(1) + desc, page)
open(p, 'w', encoding='utf-8').write(page)
print('home written:', n_steps, 'steps,', len(FEATURES), 'features')
