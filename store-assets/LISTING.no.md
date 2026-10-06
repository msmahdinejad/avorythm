# Chrome Web Store — Norwegian (no)

## Navn

Avorythm — AI-dubbing i sanntid og undertekster

## Kort beskrivelse

AI-oversettelse for fanen du velger: dubbing i sanntid, tospråklige undertekster og en synkronisert avspiller.

## Detaljert beskrivelse

Se kurs, videoer og filmer, eller lytt til podkaster på ditt eget språk. Avorythm bruker AI til å oversette lyd fra nettleserfanen du uttrykkelig velger. Hør dubbet tale i sanntid, se undertekster på originalspråket og i oversettelse, eller behold originallyden og les bare oversettelsen.

Velg avspilling med lav forsinkelse på den opprinnelige siden, eller bruk den synkroniserte opptakeren og avspilleren. Ved synkronisert opptak ligger opptaket i forkant, mens den separate avspilleren lar deg sette på pause, spole og bruke fullskjerm. Du kan avslutte opptaket manuelt.

Styr fire kanaler hver for seg: originallyd, dubbet lyd, undertekster på originalspråket og oversatte undertekster. Juster lydnivåene for begge lydsporene, flytt og endre størrelsen på undertekstfeltet, og eksporter en tilpasset WebM-video og separate SRT-undertekster. Valgfritt vanlig opptak lagrer også begge lydsporene som WAV og begge undertekstsporene som SRT.

Utvidelsen fungerer selvstendig, uten skrivebordsappen, Python, FFmpeg, localhost eller en virtuell lydenhet. Grensesnittet støtter engelsk, persisk og forenklet kinesisk. Oversettelsesspråket velges uavhengig blant 79 språkalternativer.

Oppsett: Skriv inn din egen Gemini API-nøkkel fra Google AI Studio i innstillingene, gi uttrykkelig samtykke til å sende lyd fra den valgte fanen til Google Gemini, velg språk og trykk på Start. Valgfri presisjonsmodus bruker Groq Whisper til transkripsjon, Gemini til tekstoversettelse og Gemini 3.1 Flash Live til tale. Den krever en Groq-nøkkel, valgfri vertstillatelse og eget samtykke til lydbehandling.

Personvern: Opptak starter først etter samtykke og når du trykker på Start. Lyd og transkripsjoner fra den valgte fanen sendes direkte til AI-leverandørene som trengs for den ønskede behandlingen, aldri til vedlikeholderen av Avorythm. Ingen annonser, analyseverktøy eller videresendingsserver drevet av utvikleren.

API-nøkler lagres som standard bare for økten. Du kan velge å huske nøkkelen for hver leverandør på denne enheten separat; dette er slått av som standard. Lagrede kopier synkroniseres ikke og krypteres ikke av utvidelsen. Hvis du slår av lagring av en nøkkel, slettes kopien på enheten. Hvis du fjerner en nøkkel, slettes både kopien på enheten og kopien for økten.

Vanlig opptak med fire utdata er slått av som standard. Synkronisert modus tar opp lokalt for avspilling og eksport og beholder bare det nyeste opptaket i den private lagringen til Chrome. Nedlastede filer lagres i Downloads/Avorythm.

Avorythm er gratis og har åpen kildekode. Gratiskvoter og modelltilgjengelighet hos eksterne AI-tjenester kan endres. Behandling i sanntid krever tid over nettverket og garanterer verken null forsinkelse eller feilfri oversettelse; kontroller viktig innhold. DRM-beskyttede medier og nettleserens interne sider kan hindre opptak.

Kildekode: https://github.com/msmahdinejad/avorythm

Brukerveiledning (engelsk): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Personvernerklæring: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Hva er nytt i 1.1.17

- Enklere språkvalg: populære språk først, med tydelige varianter av kinesisk og portugisisk.
- Ny prosjektdokumentasjon og nye ressurser på tysk, fransk, italiensk, russisk og arabisk.
- Oppdaterte butikkbilder basert på det faktiske produktgrensesnittet.
