# Maleton Parfum sayti: qo'llanma

## Papkalar

| Papka / fayl | Nima |
|---|---|
| `sayt/template.html` | Saytning o'zi (dizayn va mantiq) |
| `sayt/klassika.json` | Klassika atirlari: nom, brend, notalar, narxlar |
| `sayt/originals.json` | Mualliflik atirlari |
| `sayt/sozlamalar.json` | Yetkazish, idish va sovg'a narxlari |
| `sayt/img/` | Barcha rasmlar va videolar |
| `server/server.js` | Server: sayt, buyurtmalar, panel, Telegram bot |
| `server/admin.html` | Boshqaruv paneli |
| `server/.env` | Maxfiy sozlamalar (parol, bot tokeni). Hech kimga bermang |
| `server/data/orders.json` | Barcha buyurtmalar. Zaxira nusxasini olib turing |
| `idishlar/`, `tarkib/`, `sovgalar/` | Codex bilan yaratilgan asl rasmlar |

## Kompyuterda ishga tushirish

`ishga-tushirish.bat` faylini ikki marta bosing. Keyin brauzerda:

- Sayt: http://localhost:3000/
- Panel: http://localhost:3000/admin (parol `server/.env` faylida, `ADMIN_PASSWORD` qatorida)

## Telegram botni ulash

1. Telegramda @BotFather ga `/newbot` deb yozing, bot nomini bering. U token beradi.
2. `server/.env` fayliga `BOT_TOKEN=...` deb yozing va serverni qayta ishga tushiring.
3. Buyurtmalar keladigan odam (yoki guruh) botga `/id` deb yozadi. Bot chat raqamini aytadi.
4. Shu raqamni `.env` ga `ADMIN_CHAT_ID=...` deb yozing va serverni qayta ishga tushiring.

Shundan keyin har bir yangi buyurtma Telegramga keladi. Xabar ostidagi tugmalar bilan
"Tasdiqlash", "Yetkazildi" yoki "Bekor qilish" mumkin. Mijoz saytni bot ichidan ochgan bo'lsa,
holat o'zgarganda unga ham xabar boradi.

Bot buyruqlari: `/start` (xush kelibsiz va tugmalar), `/id` (chat raqami), `/buyurtmalar` (ochiq buyurtmalar, faqat admin chatida).

## Internetga chiqarish

Kerak bo'ladi: domen (masalan, maleton.uz) va Node.js 20+ o'rnatilgan server (VPS).

1. `sayt/` va `server/` papkalarini serverga ko'chiring.
2. `server/.env` ni to'ldiring: `SITE_URL=https://maleton.uz`, `BOT_TOKEN`, `ADMIN_CHAT_ID`, kuchli `ADMIN_PASSWORD`.
3. `node server.js` ni doimiy ishlaydigan qilib qo'ying (pm2 yoki systemd).
4. Oldiga HTTPS qo'ying (Caddy yoki nginx + Let's Encrypt). HTTPS bo'lmasa, sayt Telegram ichida (Mini App) ochilmaydi.
5. @BotFather da botga "Menu Button" qilib sayt manzilini bering.

## Kundalik ishlar

- **Narxni o'zgartirish, atir qo'shish yoki yashirish**: panel → Mahsulotlar.
- **Yetkazish va sovg'a narxlari**: panel → Sozlamalar.
- **Buyurtma holati**: panel → Buyurtmalar yoki Telegramdagi tugmalar.
- **Mijozlar bazasi**: panel → Mijozlar (buyurtmalardan avtomatik yig'iladi).
- **Yangi reels**: videoni `sayt/img/reels/` ga qo'yib, `template.html` dagi `REELS` ro'yxatiga qo'shish kerak.
- **Mualliflik atiri qo'shish**: idish va tarkib rasmlari kerak, shuning uchun hozircha panel orqali emas.

## Namoyish sahifasi va GitHub

- Kod: https://github.com/DavronRustamov/maleton-parfum (ommaviy repo)
- Sayt ko'rinishi: https://davronrustamov.github.io/maleton-parfum/

`sayt/` papkasida `python build.py` buyrug'i ikkala `index.html` ni yig'adi. O'zgarish havolada ko'rinishi uchun
`git add -A`, `git commit`, `git push` qilish kerak. Namoyish sahifasida buyurtma serverga yuborilmaydi,
faqat ekranda ko'rsatiladi.

Repoga tushmaydigan narsalar (`.gitignore`): `server/.env`, `server/data/`, IT taklif PDF, Telegram eksporti, xom rasmlar.

## Mijoz akkaunti (Telegram orqali kirish)

Loyihasi `hujjatlar/telegram-orqali-kirish.md` da. Hali kodga yozilmagan.
