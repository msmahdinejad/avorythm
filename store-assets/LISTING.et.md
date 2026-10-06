# Chrome Web Store — Estonian (et)

## Nimi

Avorythm — reaalajas AI-dublaaž ja subtiitrid

## Lühikirjeldus

AI abil tõlge valitud vahekaardile: reaalajas dublaaž, kakskeelsed subtiitrid ja sünkroonitud mängija.

## Üksikasjalik kirjeldus

Vaadake kursusi, videoid ja filme või kuulake taskuhäälinguid endale sobivas keeles. Avorythm kasutab AI-d, et tõlkida heli brauseri vahekaardilt, mille olete ise valinud. Kuulake reaalajas dubleeritud kõnet, vaadake lähtekeelseid ja tõlgitud subtiitreid või jätke alles algne heli ja lugege ainult tõlget.

Valige väikese viivitusega taasesitus algsel lehel või sünkroonitud salvesti ja mängija. Sünkroonitud salvestus toimub taasesitusest eespool, samal ajal kui sõltumatus mängijas saab esituse peatada, salvestises edasi või tagasi liikuda ning kasutada täisekraanvaadet. Salvestamise saab lõpetada käsitsi.

Juhtige eraldi nelja kanalit: algset heli, dubleeritud heli, lähtekeelseid subtiitreid ja tõlgitud subtiitreid. Reguleerige mõlema heli tugevust, liigutage subtiitrikihti ja muutke selle suurust ning eksportige kohandatud WebM-video ja eraldi SRT-subtiitrid. Valikuline tavaline salvestamine salvestab ka mõlemad helirajad WAV-vormingus ja mõlemad subtiitrirajad SRT-vormingus.

Laiendus töötab iseseisvalt, ilma töölauarakenduse, Python-i, FFmpeg-i, localhost-i või virtuaalse heliseadmeta. Praegune kasutajaliides on saadaval inglise, pärsia ja lihtsustatud hiina keeles; tõlkesihtkeel valitakse eraldi 79 keelevaliku hulgast.

Seadistamine: sisestage seadetes oma Gemini API-võti Google AI Studio keskkonnast, andke selgesõnaline nõusolek valitud vahekaardi heli saatmiseks Google Gemini teenusele, valige keel ja vajutage nuppu Start. Valikuline täppisrežiim kasutab transkribeerimiseks Groq Whisperit, teksti tõlkimiseks Gemini teenust ja kõne loomiseks Gemini 3.1 Flash Live'i. Selleks on vaja Groq-võtit, valikulist luba hostile juurdepääsuks ja eraldi nõusolekut heli saatmiseks.

Privaatsus: heli hõivamine algab alles pärast nõusoleku andmist ja nupu Start vajutamist. Valitud vahekaardi heli ja transkriptsioonid saadetakse otse soovitud töötluseks vajalikele AI-teenuse pakkujatele, mitte kunagi Avorythm-i haldajale. Reklaame, analüütikat ega arendaja hallatavat vahendusserverit ei ole.

Vaikimisi säilitatakse API-võtmeid ainult seansi vältel. Iga teenusepakkuja võtme meeldejätmine selles seadmes on eraldi valikuline ja vaikimisi välja lülitatud. Salvestatud koopiaid ei sünkroonita ega krüptita laienduse poolt. Meeldejätmise väljalülitamine kustutab seadmes oleva koopia; võtme kustutamine eemaldab nii seadmes kui ka seansis oleva koopia.

Tavaline nelja väljundiga salvestamine on vaikimisi välja lülitatud. Sünkroonitud režiim salvestab taasesituseks ja eksportimiseks kohapeal ning hoiab Chrome'i privaatses salvestusruumis alles ainult uusima salvestise. Allalaaditud failid salvestatakse kausta Downloads/Avorythm.

Avorythm on tasuta ja avatud lähtekoodiga. Väliste AI-teenuste tasuta kasutusmahud ja mudelite saadavus võivad muutuda. Reaalajas töötlus vajab võrguühenduse tõttu aega ega taga viivituseta tööd või täiuslikku tõlget; kontrollige olulist sisu. DRM-iga kaitstud meedia ja brauseri sisemised lehed võivad takistada heli hõivamist.

Lähtekood: https://github.com/msmahdinejad/avorythm

Kasutusjuhend (inglise keeles): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Privaatsuspoliitika: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Mis on uut versioonis 1.1.17

- Lihtsam keelevalik: levinumad keeled on eespool ning hiina ja portugali keelevariandid on selgelt eristatud.
- Uus saksakeelne, prantsuskeelne, itaaliakeelne, venekeelne ja araabiakeelne projekti dokumentatsioon ning materjalid.
- Poe pildid on uuendatud tegeliku tooteliidese põhjal.
