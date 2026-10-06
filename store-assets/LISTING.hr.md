# Chrome Web Store — Croatian (hr)

## Naziv

Avorythm — AI sinkronizacija uživo i titlovi

## Kratki opis

AI prijevod zvuka s odabrane kartice: sinkronizacija uživo, dvojezični titlovi i sinkronizirani reproduktor.

## Detaljni opis

Gledajte tečajeve, videozapise i filmove ili slušajte podcaste na svojem jeziku. Avorythm upotrebljava AI za prijevod zvuka s kartice preglednika koju izričito odaberete. Slušajte sinkronizirani govor uživo, pratite titlove na izvornom jeziku i njihov prijevod ili zadržite izvorni zvuk i čitajte samo prijevod.

Odaberite reprodukciju s malim kašnjenjem na izvornoj stranici ili sinkronizirano snimanje i reprodukciju. U sinkroniziranom načinu snimanje ide unaprijed, dok u neovisnom reproduktoru možete pauzirati, premotavati i gledati preko cijelog zaslona. Snimanje možete završiti ručno.

Neovisno upravljajte četirima kanalima: izvornim zvukom, sinkroniziranim zvukom, izvornim titlovima i prevedenim titlovima. Podesite glasnoću obaju zvučnih kanala, premjestite prikaz titlova i promijenite mu veličinu te izvezite prilagođeni videozapis WebM i zasebne titlove SRT. Neobavezno standardno snimanje također sprema oba zvučna zapisa kao WAV i oba zapisa titlova kao SRT.

Proširenje radi samostalno, bez aplikacije za računalo, programa Python ili FFmpeg, adrese localhost ili virtualnog audiouređaja. Sučelje je trenutačno dostupno na engleskom, perzijskom i pojednostavljenom kineskom; ciljni jezik prijevoda bira se zasebno među 79 jezičnih stavki.

Postavljanje: u Postavkama unesite vlastiti API ključ za Gemini iz usluge Google AI Studio, izričito pristanite na slanje zvuka s odabrane kartice usluzi Google Gemini, odaberite jezik i pritisnite Start. Neobavezni precizni način rada upotrebljava Groq Whisper za transkripciju, Gemini za prijevod teksta i Gemini 3.1 Flash Live za govor. Za njega su potrebni ključ za Groq, neobavezno dopuštenje za pristup poslužitelju i zaseban pristanak za slanje zvuka.

Privatnost: snimanje počinje tek nakon pristanka i pritiska na Start. Zvuk s odabrane kartice i transkripti šalju se izravno pružateljima AI usluga potrebnima za zatraženu obradu, nikad održavatelju proširenja Avorythm. Nema oglasa, analitike ni posredničkog poslužitelja kojim upravlja razvojni programer.

API ključevi prema zadanim postavkama ostaju samo tijekom sesije. Pamćenje ključa svakog pružatelja usluga na ovom uređaju zasebna je neobavezna mogućnost, zadano isključena. Spremljene kopije ne sinkroniziraju se i proširenje ih ne šifrira. Isključivanjem pamćenja briše se kopija na uređaju; brisanjem ključa brišu se i kopija na uređaju i kopija u sesiji.

Standardno snimanje četiriju izlaza zadano je isključeno. Sinkronizirani način snima lokalno radi reprodukcije i izvoza te u privatnoj pohrani preglednika Chrome čuva samo posljednju snimku. Preuzete datoteke spremaju se u Downloads/Avorythm.

Avorythm je besplatan i otvorenog koda. Besplatne kvote i dostupnost modela vanjskih AI usluga mogu se promijeniti. Obrada uživo zahtijeva vrijeme za mrežni prijenos i ne jamči rad bez kašnjenja ni savršen prijevod; provjerite važan sadržaj. Mediji zaštićeni tehnologijom DRM i interne stranice preglednika mogu onemogućiti snimanje.

Izvorni kod: https://github.com/msmahdinejad/avorythm

Korisnički vodič (engleski): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Pravila o privatnosti: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Što je novo u verziji 1.1.16

- Jednostavniji odabir jezika: popularni jezici prikazani su prvi, uz jasno označene inačice kineskog i portugalskog.
- Nova projektna dokumentacija i resursi na njemačkom, francuskom, talijanskom, ruskom i arapskom.
- Osvježene slike za trgovinu temeljene na stvarnom sučelju proizvoda.
