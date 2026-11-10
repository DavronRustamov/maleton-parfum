// Maleton Parfum serveri: sayt + buyurtmalar + boshqaruv paneli + Telegram bot.
// Tashqi kutubxonalar kerak emas. Ishga tushirish:  node server.js   (Node 20+)
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');

const SITE = path.join(__dirname, '..', 'sayt');
const DATA = path.join(__dirname, 'data');
const ENV_FILE = path.join(__dirname, '.env');
fs.mkdirSync(DATA, { recursive: true });

// ---------- sozlamalar (.env)
function loadEnv() {
  const env = {};
  if (fs.existsSync(ENV_FILE)) for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m) env[m[1]] = m[2];
  }
  return env;
}
const env = loadEnv();
if (!env.ADMIN_PASSWORD) {            // birinchi ishga tushirishda parol yaratiladi
  env.ADMIN_PASSWORD = crypto.randomBytes(9).toString('base64url');
  fs.appendFileSync(ENV_FILE, `${fs.existsSync(ENV_FILE) ? '\n' : ''}ADMIN_PASSWORD=${env.ADMIN_PASSWORD}\n`);
  console.log('Boshqaruv paneli uchun parol yaratildi va server/.env fayliga yozildi.');
}
const PORT = +(env.PORT || process.env.PORT || 3000);
const BOT_TOKEN = env.BOT_TOKEN || '';
let ADMIN_CHAT_ID = env.ADMIN_CHAT_ID || '';
const SITE_URL = (env.SITE_URL || '').replace(/\/$/, '');
const SELLER = env.SELLER_USERNAME || 'maletonparfum';

// ---------- fayllar
const readJSON = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; } };
function writeJSON(file, value) { const tmp = file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(value, null, 1)); fs.renameSync(tmp, file); }
const F = { originals: path.join(SITE, 'originals.json'), klassika: path.join(SITE, 'klassika.json'), settings: path.join(SITE, 'sozlamalar.json'), orders: path.join(DATA, 'orders.json') };
const catalog = () => ({ originals: readJSON(F.originals, []), klassika: readJSON(F.klassika, []), settings: readJSON(F.settings, {}) });
const orders = () => readJSON(F.orders, []);

// ---------- sayt sahifasi
function renderSite() {
  const c = catalog();
  const data = { originals: c.originals.filter(p => !p.hidden), klassika: c.klassika.filter(p => !p.hidden), settings: c.settings };
  const tpl = fs.readFileSync(path.join(SITE, 'template.html'), 'utf8').replace(/<div class="demo">[^<]*<\/div>/, '').replace('/*DATA*/', () => JSON.stringify(data).replace(/<\//g, '<\\/'));
  const cut = tpl.indexOf('</style>') + '</style>'.length;
  const desc = "Maleton Parfum: mualliflik atirlari va 500 dan ortiq dunyo atirlarining kuchaytirilgan talqinlari. Toshkent, butun O'zbekiston bo'ylab yetkazib berish.";
  return `<!doctype html>
<html lang="uz"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="${desc}">
<meta name="theme-color" content="#0f3d30">
<meta property="og:type" content="website"><meta property="og:title" content="Maleton Parfum"><meta property="og:description" content="${desc}">
${SITE_URL ? `<meta property="og:url" content="${SITE_URL}/"><meta property="og:image" content="${SITE_URL}/img/og.jpg"><link rel="canonical" href="${SITE_URL}/">` : ''}
<link rel="icon" type="image/png" href="img/favicon.png">
<style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
<script src="https://telegram.org/js/telegram-web-app.js"></script>
${tpl.slice(0, cut)}
</head><body>
${tpl.slice(cut)}
</body></html>`;
}

// ---------- buyurtma hisobi (narxlar faqat serverda hisoblanadi)
const KITS = { namuna: { pick: 3, name: "Namuna to'plami", ml: '2' }, quti: { pick: 3, ml: '30', name: 'Maleton qutisi' }, juftlik: { pick: 2, ml: '50', name: "Juftlik to'plami" }, sertifikat: { name: "Sovg'a sertifikati" } };
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + " so'm";
const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
class Bad extends Error {}
function buildOrder(body, tgUser) {
  const c = catalog(), s = c.settings;
  const all = [...c.originals, ...c.klassika].filter(p => !p.hidden);
  const byId = Object.fromEntries(all.map(p => [p.id, p]));
  const name = clean(body.name, 60), digits = String(body.phone || '').replace(/\D/g, '');
  if (name.length < 2) throw new Bad('Ismingizni yozing.');
  if (!/^998\d{9}$/.test(digits)) throw new Bad("Telefon raqamini to'liq yozing.");
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 30) throw new Bad("Savat bo'sh.");
  const mode = (body.ship && body.ship.mode) || 'pickup';
  const del = s.delivery && s.delivery[mode]; if (!del) throw new Bad("Qabul qilish usulini tanlang.");
  const region = clean(body.ship.region, 40); if (mode === 'region' && !region) throw new Bad('Viloyatni tanlang.');
  const items = [];
  for (const it of body.items) {
    const qty = Math.max(1, Math.min(20, parseInt(it.qty, 10) || 1));
    if (it.kit) {
      const k = KITS[it.kit]; if (!k) throw new Bad("Noma'lum sovg'a turi.");
      if (it.kit === 'sertifikat') {
        const amount = +it.amount; if (!(s.gifts.sertifikat || []).includes(amount)) throw new Bad("Sertifikat summasi noto'g'ri.");
        items.push({ title: k.name, detail: clean(it.sub, 200), price: amount, qty });
      } else {
        const picks = [...new Set(it.picks || [])].map(id => byId[id]);
        if (picks.length !== k.pick || picks.some(p => !p)) throw new Bad(`${k.name}: ${k.pick} ta turli atir tanlang.`);
        const price = it.kit === 'namuna' ? s.gifts.namuna : picks.reduce((a, p) => a + (p.prices[k.ml] || NaN), 0);
        if (!Number.isFinite(price)) throw new Bad(`${k.name}: tanlangan atirlardan biri bu hajmda yo'q.`);
        items.push({ title: k.name, detail: picks.map(p => p.name).join(', ') + ' · ' + k.ml + ' ml', price, qty });
      }
    } else {
      const p = byId[it.id]; const base = p && p.prices[it.ml];
      if (!base) throw new Bad("Savatdagi atirlardan biri endi sotuvda yo'q. Sahifani yangilang.");
      const b = (s.bottles || []).find(x => x.id === it.b) || { id: 'standart', name: '', price: 0, min: 0 };
      const bp = +it.ml >= (b.min || 0) ? b.price : 0;
      items.push({ id: p.id, title: p.name, detail: it.ml + ' ml' + (b.id !== 'standart' && b.name ? ' · ' + b.name : ''), price: base + bp, qty });
    }
  }
  const sub = items.reduce((a, i) => a + i.price * i.qty, 0);
  const list = orders();
  const no = 'MT-' + (1001 + list.length);
  const order = { no, ts: new Date().toISOString(), status: 'yangi', name, phone: '+' + digits,
    ship: { mode, label: del.label, region, addr: clean(body.ship.addr, 160), price: del.price },
    note: clean(body.note, 300), items, sub, total: sub + del.price, tg: tgUser ? { id: tgUser.id, username: tgUser.username || '' } : null };
  list.push(order); writeJSON(F.orders, list);
  return order;
}
const phonePretty = p => p.replace(/^(\+\d{3})(\d{2})(\d{3})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5');
function orderText(o) {
  return [`Buyurtma ${o.no}`, `Mijoz: ${o.name}, ${phonePretty(o.phone)}`,
    ...o.items.map(i => `• ${i.title} (${i.detail}) × ${i.qty} = ${fmt(i.price * i.qty)}`),
    `Qabul: ${o.ship.label}${o.ship.region ? ' (' + o.ship.region + ')' : ''}${o.ship.addr ? ', ' + o.ship.addr : ''}`,
    `Yetkazish: ${o.ship.price ? fmt(o.ship.price) : 'bepul'}`, `Jami: ${fmt(o.total)}`, o.note ? `Izoh: ${o.note}` : ''].filter(Boolean).join('\n');
}

// ---------- Telegram
const STATUS = { yangi: 'Yangi', tasdiqlandi: 'Tasdiqlandi', yetkazildi: 'Yetkazildi', bekor: 'Bekor qilindi' };
async function tg(method, params) {
  if (!BOT_TOKEN) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params), signal: AbortSignal.timeout(40000) });
    const j = await r.json(); if (!j.ok) console.log('Telegram xatosi:', method, j.description); return j.ok ? j.result : null;
  } catch (e) { if (method !== 'getUpdates') console.log('Telegram bilan aloqa yo\'q:', e.message); return null; }
}
function verifyInitData(initData) {       // Mini App'dan kelgan foydalanuvchini imzo bo'yicha tekshirish
  if (!BOT_TOKEN || !initData) return null;
  try {
    const q = new URLSearchParams(initData); const hash = q.get('hash'); q.delete('hash');
    const check = [...q.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
    const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const sig = crypto.createHmac('sha256', secret).update(check).digest('hex');
    if (!hash || hash.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(sig))) return null;
    if (Date.now() / 1000 - (+q.get('auth_date') || 0) > 86400) return null;
    return JSON.parse(q.get('user') || 'null');
  } catch (e) { return null; }
}
const adminButtons = o => o.status === 'yangi' ? [[{ text: '✅ Tasdiqlash', callback_data: `s:${o.no}:tasdiqlandi` }, { text: '❌ Bekor qilish', callback_data: `s:${o.no}:bekor` }]]
  : o.status === 'tasdiqlandi' ? [[{ text: '📦 Yetkazildi', callback_data: `s:${o.no}:yetkazildi` }, { text: '❌ Bekor qilish', callback_data: `s:${o.no}:bekor` }]] : [];
async function notifyAdmin(o) {
  if (!ADMIN_CHAT_ID) return;
  const m = await tg('sendMessage', { chat_id: ADMIN_CHAT_ID, text: `🆕 ${orderText(o)}\n\nHolat: ${STATUS[o.status]}`, reply_markup: { inline_keyboard: adminButtons(o) } });
  if (m) { const list = orders(); const x = list.find(v => v.no === o.no); if (x) { x.adminMsg = m.message_id; writeJSON(F.orders, list); } }
}
async function setStatus(no, status) {
  if (!STATUS[status]) return null;
  const list = orders(); const o = list.find(v => v.no === no); if (!o) return null;
  o.status = status; o.statusTs = new Date().toISOString(); writeJSON(F.orders, list);
  if (ADMIN_CHAT_ID && o.adminMsg) tg('editMessageText', { chat_id: ADMIN_CHAT_ID, message_id: o.adminMsg, text: `${orderText(o)}\n\nHolat: ${STATUS[status]}`, reply_markup: { inline_keyboard: adminButtons(o) } });
  if (o.tg && o.tg.id) {
    const msg = { tasdiqlandi: `Buyurtmangiz ${o.no} tasdiqlandi. Tez orada yetkazamiz.`, yetkazildi: `Buyurtmangiz ${o.no} yetkazildi. Xaridingiz uchun rahmat!`, bekor: `Buyurtmangiz ${o.no} bekor qilindi. Savol bo'lsa @${SELLER} ga yozing.` }[status];
    if (msg) tg('sendMessage', { chat_id: o.tg.id, text: msg });
  }
  return o;
}
function startKeyboard() {
  const open = SITE_URL.startsWith('https://') ? { text: '🛍 Katalogni ochish', web_app: { url: SITE_URL + '/' } } : SITE_URL ? { text: '🛍 Katalogni ochish', url: SITE_URL + '/' } : null;
  return { inline_keyboard: [open ? [open] : [], [{ text: '💬 Sotuvchi bilan bog\'lanish', url: `https://t.me/${SELLER}` }], [{ text: '📍 Do\'kon manzili', url: 'https://yandex.uz/maps/-/CXC7MJk9' }]].filter(r => r.length) };
}
async function handleUpdate(u) {
  if (u.message && u.message.text) {
    const chat = u.message.chat.id, t = u.message.text.trim();
    if (t.startsWith('/start')) return tg('sendMessage', { chat_id: chat, text: "Assalomu alaykum! Maleton Parfum botiga xush kelibsiz.\n\nMualliflik atirlari va 500 dan ortiq dunyo atirlari talqinlari. Katalogni oching, buyurtma bering yoki sotuvchiga yozing.", reply_markup: startKeyboard() });
    if (t.startsWith('/id')) return tg('sendMessage', { chat_id: chat, text: `Bu chat ID: ${chat}\nBuyurtmalar shu chatga kelishi uchun server/.env fayliga ADMIN_CHAT_ID=${chat} deb yozing va serverni qayta ishga tushiring.` });
    if (t.startsWith('/buyurtmalar') && String(chat) === String(ADMIN_CHAT_ID)) {
      const fresh = orders().filter(o => o.status === 'yangi' || o.status === 'tasdiqlandi').slice(-10);
      return tg('sendMessage', { chat_id: chat, text: fresh.length ? fresh.map(o => `${o.no} · ${STATUS[o.status]} · ${o.name} · ${fmt(o.total)}`).join('\n') : 'Ochiq buyurtmalar yo\'q.' });
    }
    return tg('sendMessage', { chat_id: chat, text: 'Katalogni ochish yoki sotuvchiga yozish uchun tugmalardan foydalaning.', reply_markup: startKeyboard() });
  }
  if (u.callback_query) {
    const cq = u.callback_query, m = /^s:(MT-\d+):(\w+)$/.exec(cq.data || '');
    if (!m || String(cq.message && cq.message.chat.id) !== String(ADMIN_CHAT_ID)) return tg('answerCallbackQuery', { callback_query_id: cq.id, text: 'Ruxsat yo\'q' });
    const o = await setStatus(m[1], m[2]);
    return tg('answerCallbackQuery', { callback_query_id: cq.id, text: o ? `${o.no}: ${STATUS[o.status]}` : 'Buyurtma topilmadi' });
  }
}
async function poll() {
  let offset = 0;
  const me = await tg('getMe', {}); if (!me) { console.log('Bot ishga tushmadi: BOT_TOKEN noto\'g\'ri yoki internet yo\'q.'); return; }
  console.log(`Telegram bot ishlayapti: @${me.username}` + (ADMIN_CHAT_ID ? '' : '  (ADMIN_CHAT_ID yo\'q: botga /id deb yozing)'));
  for (;;) {
    const ups = await tg('getUpdates', { offset, timeout: 25, allowed_updates: ['message', 'callback_query'] });
    if (!ups) { await new Promise(r => setTimeout(r, 3000)); continue; }
    for (const u of ups) { offset = u.update_id + 1; try { await handleUpdate(u); } catch (e) { console.log('Update xatosi:', e.message); } }
  }
}

// ---------- HTTP
const sessions = new Map(), attempts = new Map();
const cookie = req => Object.fromEntries((req.headers.cookie || '').split(';').map(v => v.trim().split('=')).filter(v => v[0]));
const isAdmin = req => { const t = cookie(req).mt_admin, s = t && sessions.get(t); return !!(s && s > Date.now()); };
function send(res, code, body, type) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
  res.writeHead(code, { 'Content-Type': type || 'application/json; charset=utf-8', 'Content-Length': buf.length, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
  res.end(buf);
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => { let n = 0; const parts = [];
    req.on('data', c => { n += c.length; if (n > limit) { reject(new Bad('Juda katta so\'rov.')); req.destroy(); } else parts.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(parts).toString('utf8') || '{}')); } catch (e) { reject(new Bad('Noto\'g\'ri so\'rov.')); } });
    req.on('error', reject); });
}
const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.ico': 'image/x-icon' };
function serveStatic(req, res, urlPath) {
  const rel = path.normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  const file = path.join(SITE, rel), type = TYPES[path.extname(file).toLowerCase()];
  if (!type || !file.startsWith(path.join(SITE, 'img') + path.sep) || !fs.existsSync(file)) return send(res, 404, { error: 'Topilmadi' });
  const size = fs.statSync(file).size, range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  const head = { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400', 'Accept-Ranges': 'bytes' };
  if (range && (range[1] || range[2])) {
    let start = range[1] ? +range[1] : size - +range[2], end = range[1] && range[2] ? +range[2] : size - 1;
    if (start < 0) start = 0; if (end >= size) end = size - 1;
    if (start > end) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); return res.end(); }
    res.writeHead(206, { ...head, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...head, 'Content-Length': size }); fs.createReadStream(file).pipe(res);
}
function saveProduct(body) {
  const kind = body.kind === 'originals' ? 'originals' : 'klassika';
  const list = readJSON(F[kind], []); const d = body.patch || {};
  let p = list.find(x => x.id === body.id);
  if (!p) {
    if (kind !== 'klassika') throw new Bad('Mualliflik atirini panel orqali qo\'shib bo\'lmaydi (idish rasmi kerak).');
    const max = list.reduce((a, x) => Math.max(a, +String(x.id).slice(1) || 0), 0);
    p = { id: 'k' + (max + 1), name: '', brand: '', country: '', perfumer: null, year: null, gender: 'uniseks', notes: [], prices: {}, desc: '', img: '' }; list.push(p);
  }
  if (d.name != null) p.name = clean(d.name, 80);
  if (d.brand != null && kind === 'klassika') p.brand = clean(d.brand, 80);
  if (d.country != null) p.country = clean(d.country, 60);
  if (d.desc != null) p.desc = clean(d.desc, 900);
  if (['erkak', 'ayol', 'uniseks'].includes(d.gender)) p.gender = d.gender;
  if (Array.isArray(d.notes)) p.notes = d.notes.map(n => clean(n, 40)).filter(Boolean).slice(0, 16);
  if (d.prices) { const pr = {}; for (const ml of ['10', '20', '30', '50', '100']) { const v = Math.round(+d.prices[ml]); if (v > 0 && v < 1e9) pr[ml] = v; } p.prices = pr; }
  if (typeof d.hidden === 'boolean') { if (d.hidden) p.hidden = true; else delete p.hidden; }
  if (!p.name) throw new Bad('Atir nomini yozing.');
  if (!Object.keys(p.prices).length) throw new Bad('Kamida bitta hajm uchun narx yozing.');
  if (body.image && kind === 'klassika') {
    const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(body.image); if (!m) throw new Bad('Rasm JPG, PNG yoki WEBP bo\'lishi kerak.');
    const buf = Buffer.from(m[2], 'base64'); if (buf.length > 4e6) throw new Bad('Rasm 4 MB dan kichik bo\'lsin.');
    const rel = `img/klassika/${p.id.slice(1)}-${Date.now().toString(36)}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
    fs.writeFileSync(path.join(SITE, rel), buf); p.img = rel;
  }
  if (!p.img && kind === 'klassika') throw new Bad('Yangi atir uchun rasm yuklang.');
  writeJSON(F[kind], list); return p;
}
function saveSettings(n) {
  const s = readJSON(F.settings, {});
  const money = v => { const x = Math.round(+v); if (!(x >= 0 && x < 1e9)) throw new Bad('Narx noto\'g\'ri.'); return x; };
  for (const k of Object.keys(s.delivery || {})) if (n.delivery && n.delivery[k] != null) s.delivery[k].price = money(n.delivery[k]);
  for (const b of s.bottles || []) if (n.bottles && n.bottles[b.id] != null) b.price = money(n.bottles[b.id]);
  if (n.namuna != null) s.gifts.namuna = money(n.namuna);
  if (Array.isArray(n.sertifikat)) { const a = n.sertifikat.map(money).filter(v => v > 0).slice(0, 6); if (a.length) s.gifts.sertifikat = a; }
  writeJSON(F.settings, s); return s;
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x'); const p = url.pathname;
    if (req.method === 'GET' && (p === '/' || p === '/index.html')) return send(res, 200, renderSite(), 'text/html; charset=utf-8');
    if (req.method === 'GET' && p === '/admin') return send(res, 200, fs.readFileSync(path.join(__dirname, 'admin.html')), 'text/html; charset=utf-8');
    if (req.method === 'GET' && p.startsWith('/img/')) return serveStatic(req, res, p);
    if (req.method === 'POST' && p === '/api/order') {
      const body = await readBody(req, 100000);
      const order = buildOrder(body, verifyInitData(body.tg));
      notifyAdmin(order);
      return send(res, 200, { no: order.no, text: orderText(order) });
    }
    if (req.method === 'POST' && p === '/api/admin/login') {
      const ip = req.socket.remoteAddress, now = Date.now(), a = (attempts.get(ip) || []).filter(t => now - t < 60000);
      if (a.length >= 5) return send(res, 429, { error: 'Juda ko\'p urinish. Bir daqiqadan keyin qayta urining.' });
      const body = await readBody(req, 2000); const given = Buffer.from(String(body.password || '')), real = Buffer.from(env.ADMIN_PASSWORD);
      if (given.length !== real.length || !crypto.timingSafeEqual(given, real)) { a.push(now); attempts.set(ip, a); return send(res, 401, { error: 'Parol noto\'g\'ri.' }); }
      const token = crypto.randomBytes(24).toString('base64url'); sessions.set(token, now + 12 * 3600e3);
      res.setHeader('Set-Cookie', `mt_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`);
      return send(res, 200, { ok: true });
    }
    if (p.startsWith('/api/admin/')) {
      if (!isAdmin(req)) return send(res, 401, { error: 'Kirish kerak.' });
      if (req.method === 'GET' && p === '/api/admin/state') { const c = catalog(); return send(res, 200, { orders: orders(), originals: c.originals, klassika: c.klassika, settings: c.settings, bot: { on: !!BOT_TOKEN, chat: !!ADMIN_CHAT_ID } }); }
      if (req.method === 'POST' && p === '/api/admin/order-status') { const b = await readBody(req, 2000); const o = await setStatus(b.no, b.status); return o ? send(res, 200, o) : send(res, 400, { error: 'Buyurtma yoki holat noto\'g\'ri.' }); }
      if (req.method === 'POST' && p === '/api/admin/product') return send(res, 200, saveProduct(await readBody(req, 6e6)));
      if (req.method === 'POST' && p === '/api/admin/settings') return send(res, 200, saveSettings(await readBody(req, 5000)));
      if (req.method === 'POST' && p === '/api/admin/logout') { sessions.delete(cookie(req).mt_admin); return send(res, 200, { ok: true }); }
    }
    send(res, 404, { error: 'Topilmadi' });
  } catch (e) {
    if (e instanceof Bad) return send(res, 400, { error: e.message });
    console.error(e); send(res, 500, { error: 'Serverda xato.' });
  }
});
server.listen(PORT, () => {
  console.log(`Maleton sayti: http://localhost:${PORT}/   ·   Boshqaruv paneli: http://localhost:${PORT}/admin`);
  if (BOT_TOKEN) poll(); else console.log('Telegram bot o\'chiq: server/.env fayliga BOT_TOKEN yozing.');
});
