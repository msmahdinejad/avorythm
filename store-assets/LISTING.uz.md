# Chrome Web Store — Uzbek (uz)

## Nomi

Avorythm — sun’iy intellekt yordamida jonli dublyaj va subtitrlar

## Qisqacha tavsif

Tanlangan varaq uchun sun’iy intellekt yordamida tarjima: jonli dublyaj, ikki tilli subtitrlar va sinxron pleyer.

## Batafsil tavsif

Kurslar, videolar va filmlarni o‘z tilingizda tomosha qiling yoki podkastlarni tinglang. Avorythm siz tanlagan brauzer varag‘idagi audioni sun’iy intellekt yordamida tarjima qiladi. Jonli dublyajni tinglang, asl va tarjima qilingan subtitrlarni ko‘ring yoki asl audioni saqlab, faqat tarjimani o‘qing.

Asl sahifada kechikishi kam bo‘lgan ijroni yoki sinxron yozish va ijro etish rejimini tanlang. Sinxron yozish oldindan davom etadi, mustaqil pleyerda esa ijroni to‘xtatib turish, kerakli joyga o‘tish va to‘liq ekran rejimiga o‘tish mumkin. Yozishni qo‘lda yakunlash ham mumkin.

To‘rtta kanalni mustaqil boshqaring: asl audio, dublyaj audiosi, asl tildagi subtitrlar va tarjima qilingan subtitrlar. Ikkala audioning ovoz balandligini sozlang, subtitrlar qatlamini ko‘chiring va o‘lchamini o‘zgartiring, shuningdek, sozlamalaringizga mos WebM videosi va alohida SRT subtitrlarini eksport qiling. Ixtiyoriy oddiy yozib olish rejimi ikkala audio trekni WAV, ikkala subtitr trekini esa SRT formatida saqlaydi.

Kengaytma ish stoli ilovasi, Python, FFmpeg, localhost yoki virtual audio qurilmasisiz mustaqil ishlaydi. Hozirgi interfeys ingliz, fors va soddalashtirilgan xitoy tillarida mavjud; tarjima qilinadigan til esa 79 ta til variantidan alohida tanlanadi.

Sozlash: Sozlamalarga Google AI Studio orqali olingan o‘z Gemini API kalitingizni kiriting, tanlangan varaq audiosini Google Gemini xizmatiga yuborishga aniq rozilik bering, tilni tanlang va Start tugmasini bosing. Ixtiyoriy aniq rejimda nutqni matnga aylantirish uchun Groq Whisper, matnni tarjima qilish uchun Gemini va nutq yaratish uchun Gemini 3.1 Flash Live ishlatiladi. Buning uchun Groq kaliti, ixtiyoriy sayt ruxsati va audioga oid alohida rozilik kerak.

Maxfiylik: audio faqat rozilik berib, Start tugmasini bosganingizdan keyin yozib olina boshlaydi. Tanlangan varaq audiosi va uning matnga aylantirilgan nusxalari so‘ralgan ishlov uchun zarur sun’iy intellekt xizmatlarini taqdim etuvchilarga bevosita yuboriladi, Avorythm yaratuvchisiga esa hech qachon yuborilmaydi. Reklama, tahliliy kuzatuv yoki dasturchi boshqaradigan vositachi server yo‘q.

API kalitlari odatda faqat joriy seans davomida saqlanadi. Har bir xizmat kalitini ushbu qurilmada eslab qolish alohida tanlanadigan imkoniyat bo‘lib, odatda o‘chiq turadi. Qurilmada saqlangan nusxalar sinxronlanmaydi va kengaytma tomonidan shifrlanmaydi. Eslab qolish o‘chirilsa, qurilmadagi nusxa o‘chiriladi; kalit tozalansa, uning qurilmadagi va seansdagi nusxalari ham o‘chiriladi.

To‘rtta alohida natijani saqlaydigan oddiy yozib olish rejimi odatda o‘chiq turadi. Sinxron rejim ijro etish va eksport qilish uchun yozuvni qurilmada saqlaydi hamda Chrome’ning yopiq xotirasida faqat eng so‘nggi yozuvni qoldiradi. Yuklab olingan fayllar Downloads/Avorythm jildiga saqlanadi.

Avorythm bepul va ochiq kodli. Tashqi sun’iy intellekt xizmatlarining bepul foydalanish limitlari va modellarining mavjudligi o‘zgarishi mumkin. Jonli ishlov berish tarmoq orqali vaqt talab qiladi va kechikish umuman bo‘lmasligini yoki tarjima mukammal chiqishini kafolatlamaydi; muhim ma’lumotlarni tekshiring. DRM bilan himoyalangan media va brauzerning ichki sahifalaridan audio yozib olish imkonsiz bo‘lishi mumkin.

Manba kodi: https://github.com/msmahdinejad/avorythm

Foydalanuvchi qo‘llanmasi (ingliz tilida): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Maxfiylik siyosati: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## 1.1.15 versiyasidagi yangiliklar

- Til tanlash osonlashdi: ommabop tillar birinchi ko‘rsatiladi, xitoy va portugal tillarining variantlari esa aniq ajratilgan.
- Nemis, fransuz, italyan, rus va arab tillaridagi loyiha hujjatlari va resurslari qo‘shildi.
- Do‘kon rasmlari mahsulotning haqiqiy interfeysi asosida yangilandi.
