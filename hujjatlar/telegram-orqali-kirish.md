# Mijoz akkaunti: Telegram bot orqali ro'yxatdan o'tish va kirish

**Holat:** loyihalangan, hali kodga yozilmagan. Bu hujjat nima qurilishini belgilaydi.
Hozir ishlayotgani faqat bitta qism: mijoz saytni bot ichida (Mini App) ochsa, ismi avtomatik to'ldiriladi
va buyurtmasi Telegram akkauntiga bog'lanadi.

## Qisqacha

Saytda parol ham, SMS kod ham yo'q. Mijoz "Kirish" tugmasini bosadi, Telegram botga o'tadi,
u yerda bitta tugma bilan tasdiqlaydi va saytga akkauntiga kirgan holda qaytadi.
Birinchi marta kirgan odam shu jarayonning o'zida ro'yxatdan o'tadi: alohida forma yo'q.

Nega shunday:

- O'zbekistonda mijozlarning deyarli hammasida Telegram bor, parolni esa hech kim eslab qolmaydi.
- SMS kod pullik, Telegram orqali tasdiqlash bepul.
- Telefon raqami Telegramning o'zidan keladi, ya'ni tasdiqlangan bo'ladi.
- Bot mijoz bilan aloqa kanali bo'lib qoladi: buyurtma holati, bonuslar, qayta buyurtma eslatmasi.

## Mijoz ko'zi bilan

### Birinchi marta (ro'yxatdan o'tish)

1. Saytda "Kirish" tugmasini bosadi.
2. "Telegram orqali kirish" oynasi ochiladi: telefonda tugma, kompyuterda QR kod.
3. Telegram ochiladi, mijoz botda **Start** ni bosadi.
4. Bot "Telefon raqamni yuborish" tugmasini ko'rsatadi. Mijoz bosadi, raqam Telegramdan keladi.
5. Bot so'raydi: "Maleton saytiga kirishni tasdiqlaysizmi?" va **Tasdiqlash** / **Bekor qilish** tugmalarini beradi.
6. Mijoz tasdiqlaydi. Sayt o'zi yangilanadi va mijoz akkauntida bo'ladi.

### Keyingi safar (kirish)

1 → 2 → 3 → 5 → 6. Telefon raqami qayta so'ralmaydi. Sessiya 30 kun saqlanadi,
shuning uchun bitta qurilmada bu qadamlar oyiga bir marta bo'ladi.

### Bot ichida (Mini App)

Mijoz saytni botdagi "Katalog" tugmasi orqali ochsa, hech narsa bosmaydi: darhol akkauntida bo'ladi.
Agar hali telefon raqami berilmagan bo'lsa, birinchi buyurtma paytida bir marta so'raladi.

## Akkauntda nima bo'ladi

| Bo'lim | Mazmuni |
|---|---|
| Buyurtmalarim | Barcha buyurtmalar va ularning holati |
| Qayta buyurtma | Oldingi buyurtmani bitta tugma bilan savatga qaytarish |
| Ma'lumotlarim | Ism, telefon, yetkazish manzili (buyurtma formasi shulardan to'ldiriladi) |
| Bonuslar | 2-bosqichda qo'shiladi |
| Chiqish | Shu qurilmadagi sessiyani tugatadi |

Akkauntsiz ham buyurtma berish mumkin bo'lib qoladi (hozirgidek). Kirish majburiy emas,
u qulaylik va bonuslar uchun.

## Texnik oqim

```
Sayt (brauzer)              Server                     Telegram bot
     |                         |                            |
     |-- POST /api/auth/start ->|                            |
     |<- {code, link, expires} -|  bir martalik kod yaratadi |
     |                         |                            |
     |== t.me/<bot>?start=login_<code> ochiladi ===========>|
     |                         |<-- /start login_<code> ----|
     |                         |--- telefon so'rovi ------->|  (faqat birinchi marta)
     |                         |<-- contact ----------------|
     |                         |--- "Tasdiqlaysizmi?" ----->|
     |                         |<-- callback: tasdiqlash ---|
     |                         |  kod = tasdiqlandi (tgId)  |
     |-- GET /api/auth/status ->|                            |
     |<- Set-Cookie: mt_user ---|  sessiya ochiladi          |
     |                         |--- "Kirdingiz" xabari ---->|
```

### API

| So'rov | Vazifasi |
|---|---|
| `POST /api/auth/start` | Bir martalik kod yaratadi. Javob: `{code, link, expires}` |
| `GET /api/auth/status?code=…` | Sayt har 2 soniyada so'raydi. `pending` / `ok` / `expired` / `denied`. `ok` bo'lganda sessiya cookie'si qo'yiladi |
| `POST /api/auth/telegram` | Mini App ichida: `initData` ni tekshirib, darhol sessiya ochadi |
| `GET /api/me` | Kirgan mijozning ma'lumotlari va buyurtmalari |
| `POST /api/me` | Ism va manzilni yangilash |
| `POST /api/auth/logout` | Sessiyani o'chiradi |

### Bot

| Hodisa | Bot nima qiladi |
|---|---|
| `/start login_<code>` | Kodni tekshiradi. Mijoz yangi bo'lsa telefon so'raydi, aks holda tasdiqlash tugmalarini ko'rsatadi |
| Telefon (contact) keldi | `contact.user_id` yuboruvchining o'zi ekanini tekshiradi, raqamni saqlaydi, tasdiqlash tugmalarini ko'rsatadi |
| "Tasdiqlash" bosildi | Kodni tasdiqlangan deb belgilaydi, xabarni "Kirdingiz" ga almashtiradi |
| "Bekor qilish" bosildi | Kodni bekor qiladi |

### Ma'lumotlar

`server/data/users.json`:

```json
{
  "tgId": 123456789,
  "name": "Aziz",
  "username": "aziz",
  "phone": "+998901234567",
  "address": "",
  "created": "2026-11-10T12:00:00Z",
  "lastLogin": "2026-11-10T12:00:00Z"
}
```

Buyurtmaga `tgId` yoziladi (hozir ham Mini App buyurtmalarida yoziladi), "Buyurtmalarim" shu bo'yicha yig'iladi.
Akkauntsiz berilgan eski buyurtmalar telefon raqami mos kelsa akkauntga qo'shiladi.
Paneldagi "Mijozlar" bo'limi ham shu bazadan o'qiydi.

## Xavfsizlik qoidalari

- **Kod bir martalik va 5 daqiqa yashaydi.** Ishlatilgan yoki eskirgan kod qabul qilinmaydi.
- **Kod uni so'ragan brauzerga bog'lanadi.** `start` paytida brauzerga alohida maxfiy cookie beriladi,
  `status` faqat shu cookie bilan ishlaydi. Kodni bilib olgan begona odam sessiyani ololmaydi.
- **Bot tasdiqlashdan oldin ogohlantiradi:** "Agar kirishni o'zingiz boshlamagan bo'lsangiz, tasdiqlamang."
  Bu birovning havolasini mijozga yuborib, uning nomidan kirib olish urinishidan himoya qiladi.
- **Telefon faqat Telegramning "contact" tugmasi orqali olinadi** va `contact.user_id` yuboruvchiga tengligi tekshiriladi.
  Qo'lda yozilgan raqam qabul qilinmaydi.
- **Mini App ma'lumoti (`initData`) bot tokeni bilan HMAC orqali tekshiriladi** va 24 soatdan eski bo'lsa rad etiladi.
  Bu tekshiruv serverda allaqachon bor.
- **Sessiya cookie'si:** `HttpOnly`, `Secure`, `SameSite=Lax`, 30 kun. Qiymati tasodifiy, serverda saqlanadi.
- **Cheklov:** bitta IP manzildan daqiqasiga 5 tadan ortiq `start` so'rovi qabul qilinmaydi.
- **Ma'lumot minimal:** faqat ism, Telegram ID, username, telefon va manzil saqlanadi.
  Mijoz so'rasa akkaunti o'chiriladi (buyurtmalar hisobot uchun ismsiz qoladi).

## Ishga tushishi uchun kerak

1. Bot tokeni va bot username'i (`server/.env`: `BOT_TOKEN`, `BOT_USERNAME`).
2. HTTPS'li domen. Cookie `Secure` bo'lgani va Mini App faqat HTTPS'da ochilgani uchun.
3. Ochiq savollar (mijoz bilan kelishish kerak):
   - Kirish majburiymi yoki ixtiyoriymi? Hujjatda ixtiyoriy deb olingan.
   - Telefon raqami majburiymi? Hujjatda majburiy deb olingan, chunki yetkazish uchun baribir kerak.
   - Telegrami yo'q mijozlar uchun zaxira yo'l (masalan, sotuvchiga qo'ng'iroq) kerakmi?

## Bosqichlarga bog'liqligi

IT taklifdagi 1-bosqichda "mijozlar bazasi" bor edi: hozir u buyurtmalardan yig'iladi.
Akkaunt shu bazani aniq qiladi (bitta mijoz = bitta Telegram akkaunt) va 2-bosqichdagi
bonuslar, QR orqali qayta buyurtma va shaxsiy tavsiyalar uchun asos bo'ladi.
