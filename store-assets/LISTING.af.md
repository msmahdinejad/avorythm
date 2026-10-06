# Chrome Web Store — Afrikaans (af)

## Naam

Avorythm — KI-oorklanking en onderskrifte regstreeks

## Kort beskrywing

KI-vertaling vir jou gekose oortjie: regstreekse oorklanking, tweetalige onderskrifte en 'n gesinchroniseerde speler.

## Volledige beskrywing

Kyk na kursusse, video's en films of luister na podsendings in jou taal. Avorythm gebruik KI om klank uit die blaaieroortjie wat jy uitdruklik kies, te vertaal. Luister na regstreeks oorklankte spraak, sien oorspronklike en vertaalde onderskrifte, of behou die oorspronklike klank en lees net die vertaling.

Kies tussen afspeel met lae vertraging op die oorspronklike bladsy en die gesinchroniseerde opnemer en speler. Gesinchroniseerde vaslegging loop vooruit, terwyl die afsonderlike speler jou laat onderbreek, na 'n ander posisie spring en volskerm kyk. Jy kan die opname ook self beëindig.

Beheer vier kanale onafhanklik: oorspronklike klank, oorklankte klank, oorspronklike onderskrifte en vertaalde onderskrifte. Stel albei klankvlakke af, skuif en verander die grootte van die onderskriflaag, en voer 'n pasgemaakte WebM-video en afsonderlike SRT-onderskrifte uit. Opsionele gewone opname stoor ook albei klankbane as WAV en albei onderskrifbane as SRT.

Die uitbreiding werk onafhanklik, sonder die rekenaartoepassing, Python, FFmpeg, localhost of 'n virtuele klanktoestel. Die huidige koppelvlak ondersteun Engels, Persies en Vereenvoudigde Chinees; die teikentaal vir vertaling word onafhanklik uit 79 taalopsies gekies.

Opstelling: voer jou eie Gemini-API-sleutel van Google AI Studio in Instellings in, gee uitdruklik toestemming dat klank uit die gekose oortjie na Google Gemini gestuur word, kies 'n taal en druk Begin. Die opsionele presiese modus gebruik Groq Whisper vir transkripsie, Gemini vir teksvertaling en Gemini 3.1 Flash Live vir spraak. Dit vereis 'n Groq-sleutel, opsionele gasheertoestemming en afsonderlike toestemming vir die klank.

Privaatheid: vaslegging begin eers ná jou toestemming en nadat jy Begin gedruk het. Klank en transkripsies uit die gekose oortjie gaan direk na die KI-verskaffers wat vir die verlangde verwerking nodig is, nooit na die ontwikkelaar van Avorythm nie. Geen advertensies, analise of herleibediener wat deur die ontwikkelaar bedryf word nie.

API-sleutels word by verstek net vir die sessie behou. Jy kan afsonderlik kies om elke verskaffer se sleutel op hierdie toestel te onthou; dié opsie is by verstek af. Gestoorde kopieë word nie gesinchroniseer nie en word nie deur die uitbreiding geënkripteer nie. As jy onthou afskakel, word die kopie op die toestel uitgevee; as jy 'n sleutel uitvee, word sowel die toestel- as die sessiekopie uitgevee.

Gewone opname met vier uitvoere is by verstek af. Gesinchroniseerde modus neem plaaslik op vir afspeel en uitvoer en hou net die jongste vaslegging in Chrome se private berging. Afgelaaide lêers gaan na Downloads/Avorythm.

Avorythm is gratis en oopbron. Gratis gebruikskwotas en die beskikbaarheid van modelle by eksterne KI-dienste kan verander. Regstreekse verwerking verg tyd oor die netwerk en waarborg nie geen vertraging of 'n perfekte vertaling nie; kontroleer belangrike inhoud. DRM-beskermde media en interne blaaierbladsye kan vaslegging verhinder.

Bronkode: https://github.com/msmahdinejad/avorythm

Gebruikersgids (Engels): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Privaatheidsbeleid: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Wat is nuut in 1.1.16

- Makliker taalkeuse: gewilde tale eerste, met duidelike Chinese en Portugese variante.
- Nuwe projekdokumentasie en hulpbronne in Duits, Frans, Italiaans, Russies en Arabies.
- Bygewerkte winkelbeelde wat op die werklike produkkoppelvlak gebaseer is.
