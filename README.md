# Maleton Parfum

Toshkentdagi Maleton Parfum atir do'koni uchun onlayn do'kon: katalog, savat, buyurtma,
Telegram bot va boshqaruv paneli.

**Saytni ko'rish:** https://davronrustamov.github.io/maleton-parfum/

Bu havola namoyish nusxasi: katalog va savat to'liq ishlaydi, lekin buyurtma hech qayerga yuborilmaydi.
Haqiqiy buyurtmalar uchun serverni ishga tushirish kerak (pastda).

## Nimalar bor

- Mualliflik atirlari (tarkibi sichqoncha olib borilganda ko'rinadi) va klassika katalogi: qidiruv, filtr, saralash
- Har bir atirning o'z sahifasi: hajm, idish va miqdor tanlash
- Sovg'alar bo'limi: namuna to'plami, quti, juftlik to'plami, sertifikat
- 3 savollik atir tanlash yordamchisi
- Savat va buyurtma (narxlar serverda qayta hisoblanadi)
- Telegram bot: yangi buyurtma xabari, holatni tugma bilan o'zgartirish, mijozga xabar
- Boshqaruv paneli: buyurtmalar, mijozlar, mahsulotlar, narx sozlamalari

## Ishga tushirish

Node.js 20 yoki undan yangisi kerak. Qo'shimcha kutubxona o'rnatilmaydi.

```
cd server
node server.js
```

Windows'da `ishga-tushirish.bat` ni ikki marta bosish kifoya. Sayt `http://localhost:3000/` da,
panel `http://localhost:3000/admin` da ochiladi. Birinchi ishga tushirishda `server/.env` fayli
va panel paroli o'zi yaratiladi.

## Hujjatlar

- [QOLLANMA.md](QOLLANMA.md): papkalar, botni ulash, internetga chiqarish, kundalik ishlar
- [hujjatlar/telegram-orqali-kirish.md](hujjatlar/telegram-orqali-kirish.md): mijoz akkaunti, Telegram bot orqali ro'yxatdan o'tish va kirish (loyiha, hali yozilmagan)

## Tuzilishi

| Yo'l | Nima |
|---|---|
| `sayt/template.html` | Saytning yagona manbasi (dizayn va mantiq) |
| `sayt/*.json` | Katalog va narx sozlamalari |
| `sayt/build.py` | Namoyish sahifalarini yig'adi (`index.html`) |
| `server/server.js` | Server, buyurtma API, panel, Telegram bot |
| `index.html` | GitHub Pages uchun yig'ilgan nusxa. Qo'lda tahrirlanmaydi |

Mualliflik atirlarining nomi, tarkibi va barcha narxlar hozircha taxminiy.
