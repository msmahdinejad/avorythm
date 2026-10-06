# Chrome Web Store — Dutch (nl)

## Naam

Avorythm — Live nasynchronisatie en ondertitels met AI

## Korte beschrijving

AI-vertaling voor het tabblad dat je kiest: live nasynchronisatie, tweetalige ondertitels en een gesynchroniseerde speler.

## Uitgebreide beschrijving

Bekijk cursussen, video's en films of luister naar podcasts in je eigen taal. Avorythm gebruikt AI om audio te vertalen van het browsertabblad dat je uitdrukkelijk selecteert. Luister naar live nagesynchroniseerde spraak, bekijk ondertitels in de brontaal en de vertaalde taal, of behoud de oorspronkelijke audio en lees alleen de vertaling.

Kies tussen afspelen met weinig vertraging op de oorspronkelijke pagina en de gesynchroniseerde opnamefunctie en speler. Bij gesynchroniseerde opnamen loopt de opname vooruit, terwijl je de afzonderlijke speler kunt pauzeren, door de opname kunt navigeren en op volledig scherm kunt gebruiken. Je kunt de opname handmatig beëindigen.

Bedien vier kanalen afzonderlijk: oorspronkelijke audio, nagesynchroniseerde audio, ondertitels in de brontaal en vertaalde ondertitels. Stel het volume van beide audiosporen in, verplaats de ondertitels en pas de grootte ervan aan, en exporteer een aangepaste WebM-video en afzonderlijke SRT-ondertitels. Een optionele gewone opname slaat ook beide audiosporen op als WAV en beide ondertitelsporen als SRT.

De extensie werkt zelfstandig, zonder desktopapp, Python, FFmpeg, localhost of virtueel audioapparaat. De huidige interface ondersteunt Engels, Perzisch en vereenvoudigd Chinees; de doeltaal voor vertaling kies je afzonderlijk uit 79 taalopties.

Instellen: voer in Instellingen je eigen Gemini API-sleutel van Google AI Studio in, geef uitdrukkelijk toestemming om audio van het geselecteerde tabblad naar Google Gemini te sturen, kies een taal en druk op Start. De optionele nauwkeurige modus gebruikt Groq Whisper voor transcriptie, Gemini voor tekstvertaling en Gemini 3.1 Flash Live voor spraak. Hiervoor zijn een Groq-sleutel, optionele hosttoestemming en afzonderlijke toestemming voor het versturen van audio nodig.

Privacy: de opname begint pas nadat je toestemming hebt gegeven en op Start hebt gedrukt. Audio en transcripties van het geselecteerde tabblad gaan rechtstreeks naar de AI-aanbieders die nodig zijn voor de gevraagde verwerking, nooit naar de beheerder van Avorythm. Geen advertenties, analysefuncties of door de ontwikkelaar beheerde tussenserver.

API-sleutels zijn standaard alleen beschikbaar tijdens de sessie. Je kunt voor elke aanbieder afzonderlijk kiezen of de sleutel op dit apparaat wordt onthouden; dit staat standaard uit. Opgeslagen kopieën worden niet gesynchroniseerd en niet door de extensie versleuteld. Als je onthouden uitschakelt, wordt de kopie op het apparaat verwijderd; als je een sleutel wist, worden zowel de kopie op het apparaat als de sessiekopie verwijderd.

Gewone opname met vier afzonderlijke uitvoerbestanden staat standaard uit. De gesynchroniseerde modus neemt lokaal op voor afspelen en exporteren en bewaart alleen de meest recente opname in de privéopslag van Chrome. Gedownloade bestanden komen in Downloads/Avorythm terecht.

Avorythm is gratis en open source. Gratis gebruikslimieten en de beschikbaarheid van modellen bij externe AI-diensten kunnen veranderen. Liveverwerking kost tijd via het netwerk en garandeert geen nul vertraging of perfecte vertaling; controleer belangrijke inhoud. DRM-beveiligde media en interne browserpagina's kunnen opname verhinderen.

Broncode: https://github.com/msmahdinejad/avorythm

Gebruikershandleiding (Engels): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Privacybeleid: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Nieuw in 1.1.16

- Eenvoudiger een taal kiezen: populaire talen staan vooraan, met duidelijk onderscheiden varianten van het Chinees en Portugees.
- Nieuwe projectdocumentatie en informatiebronnen in het Duits, Frans, Italiaans, Russisch en Arabisch.
- Vernieuwde afbeeldingen voor de Chrome Web Store, gebaseerd op de werkelijke productinterface.
