# Chrome Web Store — Norwegian Bokmål (nb)

## Navn

Avorythm — AI-dubbing og undertekster i sanntid

## Kort beskrivelse

AI-oversettelse av den valgte fanen: dubbing i sanntid, tospråklige undertekster og en synkronisert avspiller.

## Detaljert beskrivelse

Se kurs, videoer og filmer, eller lytt til podkaster på ditt eget språk. Avorythm bruker AI til å oversette lyd fra nettleserfanen du selv velger. Hør dubbet tale i sanntid, se undertekster på originalspråket og i oversettelse, eller behold originallyden og les bare oversettelsen.

Velg avspilling med lav forsinkelse på den opprinnelige siden, eller bruk den synkroniserte opptaksfunksjonen og avspilleren. Det synkroniserte opptaket går foran den uavhengige avspilleren, der du kan sette på pause, spole og bruke fullskjerm. Du kan avslutte opptaket manuelt.

Styr fire kanaler uavhengig av hverandre: originallyd, dubbet lyd, undertekster på originalspråket og oversatte undertekster. Juster nivået for begge lydsporene, flytt og endre størrelsen på undertekstvisningen, og eksporter en tilpasset WebM-video og separate SRT-undertekster. Et valgfritt, ordinært opptak kan også lagre begge lydsporene som WAV og begge undertekstsporene som SRT.

Utvidelsen fungerer selvstendig, uten skrivebordsappen, Python, FFmpeg, localhost eller en virtuell lydenhet. Det nåværende grensesnittet støtter engelsk, persisk og forenklet kinesisk. Språket det oversettes til, velges separat blant 79 språkoppføringer.

Oppsett: Skriv inn din egen Gemini API-nøkkel fra Google AI Studio i Innstillinger, samtykk uttrykkelig til å sende lyd fra den valgte fanen til Google Gemini, velg språk og trykk på Start. Valgfri presisjonsmodus bruker Groq Whisper til transkripsjon, Gemini til tekstoversettelse og Gemini 3.1 Flash Live til tale. Den krever en Groq-nøkkel, valgfri vertstillatelse og separat samtykke til lydoverføring.

Personvern: Lydopptak starter først etter at du har gitt samtykke og trykket på Start. Lyd og transkripsjoner fra den valgte fanen sendes direkte til AI-leverandørene som trengs for behandlingen du har bedt om, aldri til Avorythms utvikler. Ingen annonser, analyseverktøy eller videresendingsserver som drives av utvikleren.

API-nøkler lagres som standard bare for økten. Du kan velge å huske nøkkelen for hver leverandør på denne enheten uavhengig av de andre; dette er avslått som standard. Lagrede kopier synkroniseres ikke og krypteres ikke av utvidelsen. Hvis du slår av lagring, slettes kopien på enheten. Hvis du fjerner en nøkkel, slettes både kopien på enheten og kopien for økten.

Ordinært opptak med fire utdata er slått av som standard. Synkronisert modus tar opp lokalt for avspilling og eksport og beholder bare det nyeste opptaket i Chromes private lagring. Nedlastede filer legges i Downloads/Avorythm.

Avorythm er gratis og har åpen kildekode. Gratiskvoter og modelltilgjengelighet hos eksterne AI-tjenester kan endre seg. Behandling i sanntid tar tid over nettverket og garanterer verken null forsinkelse eller feilfri oversettelse. Kontroller viktig innhold. DRM-beskyttede medier og interne nettlesersider kan hindre lydopptak.

Kildekode: https://github.com/msmahdinejad/avorythm

Brukerveiledning (engelsk): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Personvernerklæring: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Hva er nytt i 1.1.15

- Enklere språkvalg: populære språk vises først, med tydelige varianter av kinesisk og portugisisk.
- Ny prosjektdokumentasjon og nye ressurser på tysk, fransk, italiensk, russisk og arabisk.
- Oppdaterte bilder i nettbutikken basert på det faktiske produktgrensesnittet.
