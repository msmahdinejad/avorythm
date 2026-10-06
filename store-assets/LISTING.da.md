# Chrome Web Store — Danish (da)

## Navn

Avorythm — live-dubbing og undertekster med AI

## Kort beskrivelse

AI-oversættelse af den fane, du vælger: live-dubbing, tosprogede undertekster og en synkroniseret afspiller.

## Detaljeret beskrivelse

Se kurser, videoer og film, eller lyt til podcasts på dit eget sprog. Avorythm bruger AI til at oversætte lyd fra den browserfane, du udtrykkeligt vælger. Lyt til oversat tale i realtid, se undertekster på originalsproget og i oversættelse, eller behold den originale lyd og læs kun oversættelsen.

Vælg afspilning med lav forsinkelse på den oprindelige side eller den synkroniserede optager og afspiller. Ved synkroniseret optagelse optages der forud, mens den separate afspiller kan sættes på pause, spole og vises i fuld skærm. Optagelsen kan afsluttes manuelt.

Styr fire kanaler hver for sig: original lyd, oversat tale, undertekster på originalsproget og oversatte undertekster. Juster lydstyrken for begge lydspor, flyt og tilpas underteksterne på skærmen, og eksporter en tilpasset WebM-video og separate SRT-undertekster. Valgfri almindelig optagelse gemmer også begge lydspor som WAV og begge undertekstspor som SRT.

Udvidelsen fungerer selvstændigt uden desktopappen, Python, FFmpeg, localhost eller en virtuel lydenhed. Brugerfladen findes på engelsk, persisk og forenklet kinesisk; oversættelsens målsprog vælges separat blandt 79 sprogposter.

Opsætning: Indtast din egen Gemini API-nøgle fra Google AI Studio under Indstillinger, giv udtrykkeligt samtykke til at sende lyd fra den valgte fane til Google Gemini, vælg et sprog, og tryk på Start. Den valgfrie præcisionstilstand bruger Groq Whisper til transskription, Gemini til tekstoversættelse og Gemini 3.1 Flash Live til tale. Den kræver en Groq-nøgle, valgfri tilladelse til værtsadgang og særskilt samtykke til behandling af lyd.

Privatliv: Optagelse begynder først efter samtykke og et tryk på Start. Lyd og transskriptioner fra den valgte fane sendes direkte til de AI-udbydere, der er nødvendige for den ønskede behandling, aldrig til udvikleren af Avorythm. Ingen annoncer, analyseværktøjer eller relayserver drevet af udvikleren.

API-nøgler gemmes som standard kun i den aktuelle session. Du kan vælge at gemme hver udbyders nøgle på denne enhed separat; det er som standard slået fra. Gemte kopier synkroniseres ikke og krypteres ikke af udvidelsen. Hvis du slår lagring fra, slettes kopien på enheden. Hvis du rydder en nøgle, slettes både kopien på enheden og kopien i sessionen.

Almindelig optagelse med fire output er som standard slået fra. Synkroniseret tilstand optager lokalt til afspilning og eksport og gemmer kun den seneste optagelse i Chromes private lager. Downloadede filer gemmes i Downloads/Avorythm.

Avorythm er gratis og har åben kildekode. Gratis kvoter og tilgængeligheden af modeller hos eksterne AI-tjenester kan ændre sig. Behandling i realtid kræver tid til netværkskommunikation og garanterer hverken nul forsinkelse eller fejlfri oversættelse; kontrollér vigtigt indhold. DRM-beskyttede medier og browserens interne sider kan forhindre optagelse.

Kildekode: https://github.com/msmahdinejad/avorythm

Brugervejledning (engelsk): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Privatlivspolitik: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Nyheder i 1.1.16

- Nemmere sprogvalg: populære sprog vises først, og kinesiske og portugisiske varianter er tydeligt angivet.
- Ny projektdokumentation og nye ressourcer på tysk, fransk, italiensk, russisk og arabisk.
- Opdaterede billeder i Chrome Web Store baseret på produktets faktiske brugerflade.
