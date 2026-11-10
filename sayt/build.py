# Demo sahifalarni yig'ish: python build.py
#   sayt/index.html  -> claude.ai artifact uchun (fragment)
#   ../index.html    -> GitHub Pages uchun (to'liq sahifa, rasmlar sayt/img/ dan olinadi)
# Haqiqiy sayt server/server.js orqali ishlaydi va shu fayllarni o'zi o'qiydi.
import json, pathlib, re
h = pathlib.Path(__file__).parent
load = lambda n: json.loads((h / n).read_text(encoding='utf-8'))
data = {"originals": [p for p in load('originals.json') if not p.get('hidden')],
        "klassika": [p for p in load('klassika.json') if not p.get('hidden')],
        "settings": load('sozlamalar.json')}
js = json.dumps(data, ensure_ascii=False).replace('</', r'<\/')
page = (h / 'template.html').read_text(encoding='utf-8').replace('/*DATA*/', js)
(h / 'index.html').write_text(page, encoding='utf-8')
print('sayt/index.html tayyor')

PAGES = 'https://davronrustamov.github.io/maleton-parfum'
DESC = ("Maleton Parfum: mualliflik atirlari va 500 dan ortiq dunyo atirlarining kuchaytirilgan talqinlari. "
        "Toshkent, butun O'zbekiston bo'ylab yetkazib berish.")
static = re.sub(r'(?<![\w/.-])img/', 'sayt/img/', page)
cut = static.index('</style>') + len('</style>')
full = f'''<!doctype html>
<html lang="uz"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="{DESC}">
<meta name="theme-color" content="#0f3d30">
<meta property="og:type" content="website"><meta property="og:title" content="Maleton Parfum">
<meta property="og:description" content="{DESC}">
<meta property="og:url" content="{PAGES}/"><meta property="og:image" content="{PAGES}/sayt/img/og.jpg">
<link rel="icon" type="image/png" href="sayt/img/favicon.png">
<style>body{{margin:0}}img{{max-width:100%}}[hidden]{{display:none!important}}</style>
{static[:cut]}
</head><body>
{static[cut:]}
</body></html>'''
(h.parent / 'index.html').write_text(full, encoding='utf-8')
print('index.html (GitHub Pages) tayyor')
