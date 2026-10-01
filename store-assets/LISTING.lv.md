# Chrome Web Store — Latvian (lv)

## Nosaukums

Avorythm — AI tiešā dublēšana un subtitri

## Īss apraksts

AI tulkošana atlasītajai cilnei: tiešā dublēšana, divvalodu subtitri un sinhronizēts atskaņotājs.

## Detalizēts apraksts

Skatieties kursus, videoklipus un filmas vai klausieties aplādes savā valodā. Avorythm izmanto AI, lai tulkotu audio no pārlūka cilnes, kuru esat skaidri atlasījis. Klausieties tiešraidē dublētu runu, skatiet avota un tulkotos subtitrus vai saglabājiet oriģinālo audio un lasiet tikai tulkojumu.

Izvēlieties zema latentuma atskaņošanu sākotnējā lapā vai sinhronizētajā ierakstītājā un atskaņotājā. Sinhronizētā tveršana notiek ar nobīdi uz priekšu, bet neatkarīgajā atskaņotājā var apturēt atskaņošanu, pārvietoties pa ierakstu un izmantot pilnekrāna režīmu. Ierakstīšanu var pabeigt manuāli.

Neatkarīgi kontrolējiet četrus kanālus: oriģinālo audio, dublēto audio, avota subtitrus un tulkotos subtitrus. Pielāgojiet abu audio celiņu skaļumu, pārvietojiet un mainiet subtitru pārklājuma izmēru, kā arī eksportējiet pielāgotu WebM video un atsevišķus SRT subtitrus. Parastā ierakstīšana pēc izvēles saglabā arī abus audio celiņus WAV formātā un abus subtitru celiņus SRT formātā.

Paplašinājums darbojas neatkarīgi, bez darbvirsmas lietotnes, Python, FFmpeg, localhost vai virtuālas audio ierīces. Pašreizējais interfeiss ir pieejams angļu, persiešu un vienkāršotajā ķīniešu valodā; tulkojuma mērķvaloda tiek izvēlēta neatkarīgi no 79 valodu ierakstiem.

Iestatīšana: sadaļā Settings ievadiet savu Gemini API atslēgu no Google AI Studio, skaidri piekrītiet atlasītās cilnes audio nosūtīšanai uz Google Gemini, izvēlieties valodu un nospiediet Start. Papildu precīzajā režīmā transkripcijai tiek izmantots Groq Whisper, teksta tulkošanai — Gemini, bet runai — Gemini 3.1 Flash Live. Tam nepieciešama Groq atslēga, pēc izvēles piešķirama resursdatora atļauja un atsevišķa piekrišana audio apstrādei.

Privātums: tveršana sākas tikai pēc piekrišanas un pogas Start nospiešanas. Atlasītās cilnes audio un transkripti tiek nosūtīti tieši tiem AI pakalpojumu sniedzējiem, kas nepieciešami pieprasītajai apstrādei, un nekad netiek nosūtīti Avorythm uzturētājam. Nav reklāmu, analītikas vai izstrādātāja pārvaldīta starpniekservera.

Pēc noklusējuma API atslēgas tiek izmantotas tikai sesijas laikā. Katras pakalpojumu sniedzēja atslēgas saglabāšana šajā ierīcē ir neatkarīgi izvēlama un pēc noklusējuma izslēgta. Saglabātās kopijas paplašinājums nesinhronizē un nešifrē. Saglabāšanas atspējošana dzēš ierīcē esošo kopiju; atslēgas notīrīšana dzēš gan ierīces, gan sesijas kopiju.

Parastā četru izvadu ierakstīšana pēc noklusējuma ir izslēgta. Sinhronizētais režīms ieraksta lokāli atskaņošanai un eksportēšanai un Chrome privātajā krātuvē saglabā tikai jaunāko tverto ierakstu. Lejupielādētie faili tiek saglabāti mapē Downloads/Avorythm.

Avorythm ir bezmaksas atvērtā pirmkoda programmatūra. Ārējo AI pakalpojumu bezmaksas limiti un modeļu pieejamība var mainīties. Tiešraides apstrādei nepieciešams tīkla savienojuma laiks, un tā negarantē nulles latentumu vai nevainojamu tulkojumu; svarīgu saturu pārbaudiet. DRM aizsargāti multivides materiāli un iekšējās pārlūka lapas var novērst tveršanu.

Avots: https://github.com/msmahdinejad/avorythm

Lietotāja rokasgrāmata (angļu valodā): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Privātuma politika: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Kas jauns versijā 1.1.15

- Vienkāršāka valodas izvēle: populārākās valodas ir norādītas vispirms, kā arī skaidri nošķirti ķīniešu un portugāļu valodas varianti.
- Jauna vācu, franču, itāļu, krievu un arābu valodā pieejama projekta dokumentācija un resursi.
- Atjaunināti veikala attēli, balstoties uz produkta faktisko interfeisu.
