#!/usr/bin/env python3
# Read the CRM's requests inbox: list new appended entries with the enum key, open each with the keeper's private key,
# check the sender's signature over items_json against the public key in the request, and write each request to a
# folder outside any repository (mode 600). Prints one line per request; prints no key.
#   python3 -I crm/tools/drain-inbox.py --vault-id <id> --enum-file <f> --key-dir ~/.sg-send/keys/<fp dir>
#        --passphrase-file <f> --out <folder outside the repo>
# API shape from a.maestro (msg 24 Nov 2026, 13:28 UTC): POST /api/vault/append/list|fetch/<id>, header
# x-sgraph-vault-enum-key. By crm.dev.a@AgentiCCells.dinis, 2026-11-24. Apache-2.0.
import argparse, base64, json, os, sys, urllib.request
from sgit_ai.crypto.PKI__Crypto import PKI__Crypto
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, utils
HOST = 'https://dev.send.sgraph.ai'
a = argparse.ArgumentParser()
for k in ['vault-id', 'enum-file', 'key-dir', 'passphrase-file', 'out']: a.add_argument('--' + k, required=True)
o = a.parse_args()
enum = open(o.enum_file).read().strip()
def post(path, body):
    req = urllib.request.Request(f'{HOST}/api/vault/append/{path}/{o.vault_id}', method='POST', data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', 'x-sgraph-vault-enum-key': enum})
    return json.load(urllib.request.urlopen(req, timeout=60))
os.makedirs(o.out, mode=0o700, exist_ok=True)
seen_f = os.path.join(o.out, 'seen.json')
seen = set(json.load(open(seen_f))) if os.path.exists(seen_f) else set()
entries, after = [], None
while True:
    body = {'include_content': False}
    if after: body['after_file_id'] = after
    r = post('list', body); entries += r.get('entries', [])
    if not r.get('truncated') or not r.get('entries'): break
    after = r['entries'][-1]['file_id']
new = [e for e in entries if e['file_id'] not in seen]
c = PKI__Crypto()
priv = c.import_private_key_pem(open(os.path.join(o.key_dir, 'private_key.pem')).read(), passphrase=open(o.passphrase_file).read().strip())
def verify(req):
    try:
        pem = req['signed']['bundle']['sign']
        pub = serialization.load_pem_public_key(pem.encode())
        raw = base64.b64decode(req['signed']['sig']); r, s = int.from_bytes(raw[:32], 'big'), int.from_bytes(raw[32:], 'big')
        pub.verify(utils.encode_dss_signature(r, s), req['items_json'].encode(), ec.ECDSA(hashes.SHA256()))
        return True
    except Exception:
        return False
print(f'{len(entries)} entries, {len(new)} new')
for i in range(0, len(new), 20):
    batch = new[i:i + 20]
    files = post('fetch', {'inbox': batch[0].get('inbox'), 'file_ids': [e['file_id'] for e in batch]}).get('files') or post('fetch', {'file_ids': [e['file_id'] for e in batch]}).get('files', [])
    for f in files:
        try:
            env = base64.b64decode(f['content']).decode()
            d = c.hybrid_decrypt(priv, env); text = d.get('plaintext') if isinstance(d, dict) else d
            text = text.decode() if isinstance(text, bytes) else text
            req = json.loads(text)
        except Exception as e:
            print(f"{f['file_id']}: could not open ({type(e).__name__})"); seen.add(f['file_id']); continue
        ok = verify(req) if 'signed' in req else None
        items = json.loads(req['items_json']) if 'items_json' in req else req
        path = os.path.join(o.out, f"{f['file_id']}.json")
        with open(os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), 'w') as fh: json.dump({'received': f.get('received'), 'signature_ok': ok, 'request': req}, fh, indent=2)
        print(f"{f.get('received')} | {req.get('from', '?')} | key {req.get('signed', {}).get('key', '-')} | signature {'ok' if ok else 'FAILED' if ok is False else 'none'} | {items.get('kind', '?')}: {str(items.get('text', ''))[:200]}")
        seen.add(f['file_id'])
with open(os.open(seen_f, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), 'w') as fh: json.dump(sorted(seen), fh)
