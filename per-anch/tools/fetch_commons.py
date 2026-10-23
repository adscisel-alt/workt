#!/usr/bin/env python3
"""Pobiera z Wikimedia Commons zdjęcia na wolnych licencjach (domena publiczna, CC0, CC BY, CC BY-SA)
do Analizatora Ściany aplikacji Per-Anch. Uruchamiany w GitHub Actions (środowisko sesji nie ma dostępu do Commons).

  search  <queries.json> <out_dir> [width]   – podglądy kandydatów + manifest.json
  fetch   <chosen.json>  <out_dir> [width]   – wybrane pliki w pełnej jakości + credits.json
"""
import json, os, re, sys, time, html, urllib.request, urllib.parse

API = 'https://commons.wikimedia.org/w/api.php'
UA = 'PerAnchAkademia/1.0 (https://github.com/adscisel-alt/workt; educational, contact via GitHub)'
LIC_OK = re.compile(r'(public domain|^pd\b|pd-|cc0|cc[- ]by(?![- ]nc)(?![- ]nd))', re.I)
LIC_BAD = re.compile(r'(\bnc\b|non-?commercial|\bnd\b|no derivatives|fair use|copyright)', re.I)

def api(params):
    params = dict(params, format='json', formatversion='2')
    req = urllib.request.Request(API + '?' + urllib.parse.urlencode(params), headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.load(r)

def download(url, path):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=120) as r, open(path, 'wb') as f:
        f.write(r.read())

def strip(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s or '')).strip()

def info(ii, md):
    return {
        'title': ii['_title'], 'pageurl': ii.get('descriptionurl'), 'url': ii.get('url'),
        'thumburl': ii.get('thumburl'), 'width': ii.get('width'), 'height': ii.get('height'),
        'mime': ii.get('mime'), 'author': strip(md.get('Artist', {}).get('value', '')),
        'credit': strip(md.get('Credit', {}).get('value', '')),
        'license': md.get('LicenseShortName', {}).get('value', ''),
        'licenseurl': md.get('LicenseUrl', {}).get('value', ''),
        'desc': strip(md.get('ImageDescription', {}).get('value', ''))[:400],
    }

def license_ok(lic):
    return bool(LIC_OK.search(lic)) and not LIC_BAD.search(lic)

def pages_for(params, width):
    data = api(dict(params, prop='imageinfo', iiprop='url|extmetadata|size|mime', iiurlwidth=str(width)))
    out = []
    for p in data.get('query', {}).get('pages', []):
        if 'imageinfo' not in p:
            continue
        ii = p['imageinfo'][0]; ii['_title'] = p['title']
        out.append(info(ii, ii.get('extmetadata', {})))
    return out

def search(qfile, out, width):
    queries = json.load(open(qfile, encoding='utf-8'))
    manifest = []
    for q in queries:
        key = q['key']; os.makedirs(os.path.join(out, key), exist_ok=True); n = 0
        print('==', key, q['search'], flush=True)
        try:
            items = pages_for({'action': 'query', 'generator': 'search', 'gsrsearch': q['search'] + ' filetype:bitmap',
                               'gsrnamespace': '6', 'gsrlimit': str(q.get('limit', 10))}, width)
        except Exception as e:
            print('  search failed:', e); continue
        for it in items:
            if not license_ok(it['license']) or (it['width'] or 0) < 700 or not it['thumburl']:
                print('  skip', it['title'], '|', it['license']); continue
            n += 1; fn = f'{n:02d}.jpg'
            try:
                download(it['thumburl'], os.path.join(out, key, fn))
            except Exception as e:
                print('  download failed', it['title'], e); n -= 1; continue
            it.update(key=key, file=f'{key}/{fn}'); manifest.append(it)
            print('  ok', fn, it['title'], '|', it['license'], '|', it['author'][:40]); time.sleep(0.4)
    json.dump(manifest, open(os.path.join(out, 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

def fetch(cfile, out, width):
    chosen = json.load(open(cfile, encoding='utf-8'))
    os.makedirs(out, exist_ok=True); credits = []
    for c in chosen:
        print('==', c['name'], c['title'], flush=True)
        items = pages_for({'action': 'query', 'titles': c['title']}, c.get('width', width))
        if not items:
            print('  not found'); continue
        it = items[0]
        if not license_ok(it['license']):
            print('  license not free:', it['license']); continue
        download(it['thumburl'] or it['url'], os.path.join(out, c['name'] + '.jpg'))
        it.update(name=c['name'], file=c['name'] + '.jpg'); credits.append(it); print('  ok', it['license']); time.sleep(0.4)
    json.dump(credits, open(os.path.join(out, 'credits.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

if __name__ == '__main__':
    mode, a, out = sys.argv[1], sys.argv[2], sys.argv[3]
    width = int(sys.argv[4]) if len(sys.argv) > 4 else (480 if mode == 'search' else 1600)
    (search if mode == 'search' else fetch)(a, out, width)
