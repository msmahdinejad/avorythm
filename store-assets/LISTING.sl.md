# Chrome Web Store — Slovenian (sl)

## Ime

Avorythm — Sprotna govorna sinhronizacija in podnapisi z AI

## Kratek opis

Prevajanje z AI za izbrani zavihek: sprotna govorna sinhronizacija, dvojezični podnapisi in usklajen predvajalnik.

## Podroben opis

Oglejte si tečaje, videoposnetke in filme ali poslušajte podkaste v svojem jeziku. Avorythm z AI prevaja zvok iz zavihka brskalnika, ki ga izrecno izberete. Poslušajte sproti sinhroniziran govor, spremljajte izvirne in prevedene podnapise ali obdržite izvirni zvok in berite samo prevod.

Izberite predvajanje z majhno zakasnitvijo na izvirni strani ali usklajeno snemanje s predvajalnikom. Pri usklajenem snemanju zajem poteka vnaprej, neodvisni predvajalnik pa omogoča premor, preskakovanje po posnetku in celozaslonski prikaz. Snemanje lahko končate ročno.

Neodvisno upravljajte štiri kanale: izvirni zvok, sinhronizirani zvok, izvirne podnapise in prevedene podnapise. Nastavite glasnost obeh zvočnih kanalov, premaknite in spremenite velikost prikaza podnapisov ter izvozite prilagojen videoposnetek WebM in ločene podnapise SRT. Neobvezajno običajno snemanje shrani tudi oba zvočna posnetka v obliki WAV in oba zapisa podnapisov v obliki SRT.

Razširitev deluje samostojno, brez namizne aplikacije, Python, FFmpeg, localhost ali navidezne zvočne naprave. Trenutni vmesnik je na voljo v angleščini, perzijščini in poenostavljeni kitajščini; ciljni jezik prevoda izberete ločeno med 79 jezikovnimi možnostmi.

Nastavitev: v nastavitve vnesite svoj ključ API za Gemini iz Google AI Studio, izrecno privolite v pošiljanje zvoka iz izbranega zavihka storitvi Google Gemini, izberite jezik in pritisnite Start. Neobvezni natančni način uporablja Groq Whisper za prepis, Gemini za prevajanje besedila in Gemini 3.1 Flash Live za govor. Zanj potrebujete ključ Groq, neobvezno dovoljenje za dostop do gostitelja in ločeno privolitev za pošiljanje zvoka.

Zasebnost: zajem se začne šele po privolitvi in pritisku na Start. Zvok iz izbranega zavihka in prepisi se pošljejo neposredno ponudnikom AI, potrebnim za zahtevano obdelavo, nikoli vzdrževalcu razširitve Avorythm. Brez oglasov, analitike ali posredniškega strežnika, ki bi ga upravljal razvijalec.

Ključi API se privzeto hranijo samo za čas seje. Shranjevanje ključa posameznega ponudnika v tej napravi lahko omogočite ločeno; privzeto je izklopljeno. Shranjene kopije se ne sinhronizirajo in jih razširitev ne šifrira. Če shranjevanje izklopite, se kopija v napravi izbriše; če ključ počistite, se izbrišeta kopiji v napravi in seji.

Običajno snemanje s štirimi izhodnimi datotekami je privzeto izklopljeno. Usklajeni način snema lokalno za predvajanje in izvoz ter v zasebni shrambi brskalnika Chrome ohrani samo zadnji zajem. Prenesene datoteke se shranijo v Downloads/Avorythm.

Avorythm je brezplačen in odprtokoden. Brezplačne kvote in razpoložljivost modelov zunanjih storitev AI se lahko spremenijo. Sprotna obdelava zahteva čas za omrežni prenos in ne zagotavlja delovanja brez zakasnitve ali popolnega prevoda; pomembno vsebino preverite. Mediji, zaščiteni z DRM, in notranje strani brskalnika lahko preprečijo zajem.

Izvorna koda: https://github.com/msmahdinejad/avorythm

Uporabniški priročnik (v angleščini): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Pravilnik o zasebnosti: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Novosti v različici 1.1.17

- Lažja izbira jezika: priljubljeni jeziki so na vrhu, različice kitajščine in portugalščine pa so jasno označene.
- Nova projektna dokumentacija in viri v nemščini, francoščini, italijanščini, ruščini in arabščini.
- Posodobljene slike v trgovini, ki temeljijo na dejanskem vmesniku izdelka.
