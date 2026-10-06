# Chrome Web Store — Swedish (sv)

## Namn

Avorythm — AI-dubbning i realtid och undertexter

## Kort beskrivning

AI-översättning för vald flik: dubbning i realtid, tvåspråkiga undertexter och en synkroniserad spelare.

## Detaljerad beskrivning

Se kurser, videor och filmer eller lyssna på poddar på ditt språk. Avorythm använder AI för att översätta ljud från den webbläsarflik du uttryckligen väljer. Lyssna på dubbning i realtid, visa undertexter på originalspråket och i översättning, eller behåll originalljudet och läs enbart översättningen.

Välj uppspelning med låg fördröjning på den ursprungliga sidan eller använd den synkroniserade inspelaren och spelaren. Vid synkroniserad inspelning spelas innehållet in i förväg, medan den fristående spelaren kan pausas, spolas och visas i helskärmsläge. Inspelningen kan avslutas manuellt.

Styr fyra kanaler var för sig: originalljud, dubbat ljud, undertexter på originalspråket och översatta undertexter. Blanda ljudnivåerna, flytta och ändra storlek på undertexternas överlägg samt exportera en anpassad WebM-video och separata SRT-undertexter. En valfri vanlig inspelning sparar också båda ljudspåren som WAV och båda undertextspåren som SRT.

Tillägget fungerar fristående, utan skrivbordsappen, Python, FFmpeg, localhost eller en virtuell ljudenhet. Gränssnittet finns för närvarande på engelska, persiska och förenklad kinesiska. Översättningsspråket väljs separat bland 79 språkalternativ.

Kom igång: ange din egen Gemini API-nyckel från Google AI Studio i Inställningar, samtyck uttryckligen till att ljud från den valda fliken skickas till Google Gemini, välj ett språk och tryck på Start. Det valfria precisionsläget använder Groq Whisper för transkribering, Gemini för textöversättning och Gemini 3.1 Flash Live för tal. Det kräver en Groq-nyckel, valfri värdbehörighet och separat samtycke till ljudöverföring.

Integritet: ljudinsamlingen börjar först efter att du har samtyckt och tryckt på Start. Ljud och transkriptioner från den valda fliken skickas direkt till de AI-leverantörer som behövs för den begärda bearbetningen, aldrig till Avorythms utvecklare. Inga annonser, ingen analysdatainsamling och ingen reläserver som drivs av utvecklaren.

API-nycklar lagras som standard endast under sessionen. Du kan välja separat för varje leverantörsnyckel om den ska sparas på den här enheten; detta är avstängt som standard. Sparade kopior synkroniseras inte och krypteras inte av tillägget. Om du stänger av lagringen raderas kopian på enheten. Om du rensar en nyckel raderas både kopian på enheten och sessionskopian.

Vanlig inspelning med fyra utdata är avstängd som standard. Det synkroniserade läget spelar in lokalt för uppspelning och export och behåller endast den senaste inspelningen i Chromes privata lagringsutrymme. Nedladdade filer hamnar i Downloads/Avorythm.

Avorythm är gratis och har öppen källkod. Gratis kvoter och tillgången till modeller hos externa AI-tjänster kan förändras. Bearbetning i realtid kräver tid för nätverksöverföring och garanterar varken noll fördröjning eller perfekt översättning; kontrollera viktigt innehåll. DRM-skyddat material och webbläsarens interna sidor kan hindra ljudinsamling.

Källkod: https://github.com/msmahdinejad/avorythm

Användarhandbok (engelska): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Integritetspolicy: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Nyheter i 1.1.17

- Enklare språkval: populära språk visas först, med tydliga varianter av kinesiska och portugisiska.
- Ny projektdokumentation och nya resurser på tyska, franska, italienska, ryska och arabiska.
- Uppdaterade butiksbilder baserade på produktens faktiska gränssnitt.
