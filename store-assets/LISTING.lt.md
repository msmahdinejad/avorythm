# Chrome Web Store — Lithuanian (lt)

## Pavadinimas

Avorythm — tiesioginis DI dubliavimas ir subtitrai

## Trumpas aprašymas

DI verčia pasirinkto skirtuko garsą: tiesioginis dubliavimas, dvikalbiai subtitrai ir sinchronizuotas grotuvas.

## Išsamus aprašymas

Žiūrėkite kursus, vaizdo įrašus ir filmus arba klausykitės tinklalaidžių savo kalba. Avorythm pasitelkia dirbtinį intelektą garsui iš naršyklės skirtuko, kurį aiškiai pasirenkate, versti. Klausykitės tiesiogiai dubliuojamos kalbos, matykite originalo ir vertimo subtitrus arba palikite originalų garsą ir skaitykite tik vertimą.

Rinkitės mažos delsos atkūrimą pradiniame puslapyje arba sinchronizuotą įrašymo ir atkūrimo režimą. Sinchronizuotas įrašymas vyksta į priekį, o atskirame grotuve galima pristabdyti įrašą, pereiti į kitą jo vietą ir įjungti viso ekrano režimą. Įrašymą galima baigti rankiniu būdu.

Atskirai valdykite keturis kanalus: originalų garsą, dubliuotą garsą, originalo subtitrus ir vertimo subtitrus. Reguliuokite abiejų garso takelių lygius, perkelkite subtitrų sluoksnį ir keiskite jo dydį, taip pat eksportuokite pagal poreikius pritaikytą WebM vaizdo įrašą ir atskirus SRT subtitrus. Pasirinktinis įprastas įrašymas taip pat išsaugo abu garso takelius WAV formatu ir abu subtitrų takelius SRT formatu.

Plėtinys veikia savarankiškai: jam nereikia kompiuterio programos, Python, FFmpeg, localhost ar virtualaus garso įrenginio. Dabartinė sąsaja palaiko tik anglų, persų ir supaprastintą kinų kalbas; vertimo kalba pasirenkama atskirai iš 79 kalbų sąrašo.

Sąranka: nustatymuose įveskite savo Gemini API raktą, gautą iš Google AI Studio, aiškiai sutikite siųsti pasirinkto skirtuko garsą į Google Gemini, pasirinkite kalbą ir spustelėkite „Start“. Pasirinktiniu tiksliuoju režimu transkripcijai naudojamas Groq Whisper, tekstui versti – Gemini, o kalbai generuoti – Gemini 3.1 Flash Live. Šiam režimui reikia Groq rakto, pasirinktinio leidimo pasiekti paslaugos adresą ir atskiro sutikimo siųsti garsą.

Privatumas: garso fiksavimas pradedamas tik davus sutikimą ir spustelėjus „Start“. Pasirinkto skirtuko garsas ir transkripcijos siunčiami tiesiogiai dirbtinio intelekto paslaugų teikėjams, kurių reikia prašomam apdorojimui, bet niekada ne Avorythm kūrėjui. Nėra reklamų, analitikos ar kūrėjo valdomo tarpinio serverio.

Pagal numatytuosius nustatymus API raktai saugomi tik seanso metu. Galimybė įsiminti kiekvieno paslaugų teikėjo raktą šiame įrenginyje yra atskirai pasirenkama ir pagal numatytuosius nustatymus išjungta. Išsaugotos kopijos nesinchronizuojamos ir plėtinio nešifruojamos. Išjungus rakto įsiminimą, jo kopija įrenginyje ištrinama; pašalinus raktą, ištrinamos ir įrenginyje, ir seanso metu saugomos jo kopijos.

Įprastas keturių išvesties takelių įrašymas pagal numatytuosius nustatymus išjungtas. Sinchronizuotu režimu įrašas vietoje kuriamas atkūrimui ir eksportui, o privačiojoje Chrome saugykloje laikomas tik naujausias įrašas. Atsisiųsti failai išsaugomi aplanke Downloads/Avorythm.

Avorythm yra nemokamas ir atvirojo kodo. Išorinių dirbtinio intelekto paslaugų nemokamo naudojimo limitai ir modelių prieinamumas gali keistis. Tiesioginiam apdorojimui reikia laiko duomenims perduoti tinklu, todėl negarantuojama nei nulinė delsa, nei tobulas vertimas; svarbų turinį patikrinkite. DRM apsaugota medija ir vidiniai naršyklės puslapiai gali neleisti fiksuoti garso.

Pirminis kodas: https://github.com/msmahdinejad/avorythm

Naudotojo vadovas (anglų kalba): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Privatumo politika: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Kas naujo 1.1.15 versijoje

- Paprastesnis kalbos pasirinkimas: populiarios kalbos rodomos pirmiausia, aiškiai atskirti kinų ir portugalų kalbų variantai.
- Nauja projekto dokumentacija ir ištekliai vokiečių, prancūzų, italų, rusų ir arabų kalbomis.
- Atnaujinti parduotuvės vaizdai, sukurti pagal tikrąją produkto sąsają.
