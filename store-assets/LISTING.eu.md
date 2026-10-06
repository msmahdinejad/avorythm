# Chrome Web Store — Basque (eu)

## Izena

Avorythm — AI bidezko zuzeneko bikoizketa eta azpitituluak

## Deskribapen laburra

AI bidezko itzulpena fitxa hautatuan: zuzeneko bikoizketa, azpititulu elebidunak eta sinkronizatutako erreproduzitzailea.

## Deskribapen xehea

Ikusi ikastaroak, bideoak eta filmak edo entzun podcastak zure hizkuntzan. Avorythm-ek hautatzen duzun arakatzaile-fitxako audioa itzultzen du AIa erabiliz. Entzun zuzeneko ahots bikoiztua, ikusi jatorrizko eta itzulitako azpitituluak, edo mantendu jatorrizko audioa eta irakurri itzulpena soilik.

Aukeratu latentzia txikiko erreprodukzioa jatorrizko orrian edo sinkronizatutako grabagailu eta erreproduzitzailean. Sinkronizatutako kapturak aurrera egiten du, eta erreproduzitzaile independentean pausa egin, posizioa aldatu eta pantaila osoa erabil dezakezu. Grabazioa eskuz amai daiteke.

Kontrolatu lau kanalak modu independentean: jatorrizko audioa, bikoiztutako audioa, jatorrizko azpitituluak eta itzulitako azpitituluak. Nahastu bi audioen mailak, mugitu eta aldatu azpitituluen gainjarpenaren tamaina, eta esportatu WebM bideo pertsonalizatua eta SRT azpititulu bereiziak. Aukerako ohiko grabaketak bi audio-pistak WAV gisa eta bi azpititulu-pistak SRT gisa ere gordetzen ditu.

Luzapenak modu independentean funtzionatzen du, mahaigaineko aplikaziorik, Python, FFmpeg, localhost edo audio-gailu birtualik gabe. Luzapenaren interfazea ingelesez, persieraz eta txinera sinplifikatuan dago; itzulpenaren xede-hizkuntza 79 hizkuntzako zerrendatik hautatzen da modu independentean.

Konfigurazioa: sartu Google AI Studio-ko zure Gemini API gakoa Ezarpenetan, eman berariazko baimena hautatutako fitxako audioa Google Gemini-ra bidaltzeko, aukeratu hizkuntza bat eta sakatu Hasi. Aukerako doitasun-moduak Groq Whisper erabiltzen du transkripziorako, Gemini testu-itzulpenerako eta Gemini 3.1 Flash Live hizketarako. Groq gako bat, aukerako ostalari-baimena eta audiorako beste baimen bat behar ditu.

Pribatutasuna: kaptura baimena eman eta Hasi sakatu ondoren bakarrik hasten da. Hautatutako fitxako audioa eta transkripzioak eskatutako prozesamendurako behar diren AI-hornitzaileengana bidaltzen dira zuzenean, eta inoiz ez Avorythm-en mantentzaileari. Ez dago iragarkirik, analitikarik edo garatzaileak kudeatutako errelebo-zerbitzaririk.

API gakoak saioan bakarrik erabiltzen dira lehenespenez. Hornitzaile bakoitzaren gakoa gailu honetan gogoratzea aukerakoa da modu independentean, eta desaktibatuta dago lehenespenez. Gordetako kopiak ez ditu luzapenak sinkronizatzen eta ez ditu enkriptatzen. Gogoratzea desgaitzean, gailuko kopia ezabatzen da; gako bat garbitzean, gailuko eta saioko kopiak ezabatzen dira.

Lau irteerako ohiko grabaketa desaktibatuta dago lehenespenez. Sinkronizatutako moduak lokalean grabatzen du erreproduzitzeko eta esportatzeko, eta azken kaptura bakarrik gordetzen du Chrome-ren biltegiratze pribatuan. Deskargatutako fitxategiak Downloads/Avorythm karpetara doaz.

Avorythm doakoa eta iturburu irekikoa da. Kanpoko AI zerbitzuen doako kuotak eta modeloen erabilgarritasuna alda daitezke. Zuzeneko prozesamenduak sareko denbora behar du, eta ez du latentziarik ez egotea edo itzulpen perfektua bermatzen; egiaztatu eduki garrantzitsua. DRM bidez babestutako multimedia-edukiek eta barneko arakatzaile-orriek kaptura eragotz dezakete.

Iturburua: https://github.com/msmahdinejad/avorythm

Erabiltzaile-gida (ingelesez): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Pribatutasun-politika: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Zer berri: version 1.1.17

- Hizkuntza errazago hautatzeko aukera: hizkuntza erabilienak lehenik, txineraren eta portugesaren aldaera argiekin.
- Alemanierazko, frantsesezko, italierazko, errusierazko eta arabierazko proiektu-dokumentazio eta baliabide berriak.
- Produktuaren benetako interfazian oinarritutako dendako irudi eguneratuak.
