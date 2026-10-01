# Chrome Web Store — Slovak (sk)

## Názov

Avorythm — živý dabing a titulky pomocou AI

## Krátky opis

Preklad vybranej karty pomocou AI: živý dabing, dvojjazyčné titulky a synchronizovaný prehrávač.

## Podrobný opis

Sledujte kurzy, videá a filmy alebo počúvajte podcasty vo svojom jazyku. Avorythm používa AI na preklad zvuku z karty prehliadača, ktorú výslovne vyberiete. Počúvajte živý dabing, zobrazte si titulky v pôvodnom jazyku aj ich preklad alebo si nechajte pôvodný zvuk a čítajte iba preklad.

Vyberte si prehrávanie s nízkym oneskorením na pôvodnej stránke alebo synchronizované nahrávanie s prehrávačom. Synchronizované nahrávanie beží s predstihom, zatiaľ čo v samostatnom prehrávači môžete pozastaviť prehrávanie, preskakovať na iné miesto a prejsť do režimu celej obrazovky. Nahrávanie môžete ukončiť ručne.

Ovládajte nezávisle štyri kanály: pôvodný zvuk, dabovaný zvuk, titulky v pôvodnom jazyku a preložené titulky. Nastavte hlasitosť oboch zvukových stôp, premiestnite a zmeňte veľkosť titulkov na obrazovke a exportujte prispôsobené video vo formáte WebM a samostatné titulky vo formáte SRT. Voliteľné bežné nahrávanie tiež ukladá obe zvukové stopy vo formáte WAV a obe titulkové stopy vo formáte SRT.

Rozšírenie funguje samostatne, bez počítačovej aplikácie, Python, FFmpeg, localhost či virtuálneho zvukového zariadenia. Rozhranie je dostupné v angličtine, perzštine a zjednodušenej čínštine; cieľový jazyk prekladu sa vyberá nezávisle zo 79 jazykových položiek.

Nastavenie: v nastaveniach zadajte vlastný kľúč API pre Gemini zo služby Google AI Studio, výslovne udeľte súhlas s odosielaním zvuku z vybranej karty do Google Gemini, zvoľte jazyk a stlačte Spustiť. Voliteľný presný režim používa Groq Whisper na prepis, Gemini na preklad textu a Gemini 3.1 Flash Live na tvorbu reči. Vyžaduje kľúč Groq, voliteľné povolenie prístupu k hostiteľovi a samostatný súhlas so spracovaním zvuku.

Ochrana súkromia: zachytávanie sa začne až po udelení súhlasu a stlačení tlačidla Spustiť. Zvuk a prepisy z vybranej karty sa odosielajú priamo poskytovateľom AI potrebným na požadované spracovanie, nikdy nie správcovi Avorythm. Bez reklám, analytiky či sprostredkovacieho servera prevádzkovaného vývojárom.

Kľúče API sa predvolene uchovávajú iba počas relácie. Zapamätanie kľúča každého poskytovateľa v tomto zariadení je samostatne voliteľné a predvolene vypnuté. Uložené kópie sa nesynchronizujú a rozšírenie ich nešifruje. Vypnutím zapamätania sa odstráni kópia v zariadení; vymazaním kľúča sa odstráni kópia v zariadení aj v relácii.

Bežné nahrávanie so štyrmi výstupmi je predvolene vypnuté. Synchronizovaný režim nahráva lokálne na účely prehrávania a exportu a v súkromnom úložisku Chrome uchováva iba posledný záznam. Stiahnuté súbory sa ukladajú do priečinka Downloads/Avorythm.

Avorythm je bezplatný a má otvorený zdrojový kód. Bezplatné kvóty a dostupnosť modelov externých služieb AI sa môžu meniť. Živé spracovanie si vyžaduje čas na prenos cez sieť a nezaručuje nulové oneskorenie ani dokonalý preklad; dôležitý obsah si overte. Médiá chránené technológiou DRM a interné stránky prehliadača môžu brániť zachytávaniu.

Zdrojový kód: https://github.com/msmahdinejad/avorythm

Používateľská príručka (v angličtine): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Zásady ochrany súkromia: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Čo je nové vo verzii 1.1.15

- Jednoduchší výber jazyka: obľúbené jazyky sú na začiatku a varianty čínštiny a portugalčiny sú jasne rozlíšené.
- Nová projektová dokumentácia a zdroje v nemčine, francúzštine, taliančine, ruštine a arabčine.
- Aktualizované obrázky v obchode založené na skutočnom rozhraní produktu.
