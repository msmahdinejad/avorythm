# Chrome Web Store — Catalan (ca)

## Nom

Avorythm — Doblatge en directe i subtítols amb IA

## Descripció breu

Traducció amb IA de la pestanya seleccionada: doblatge en directe, subtítols bilingües i un reproductor sincronitzat.

## Descripció detallada

Mira cursos, vídeos i pel·lícules o escolta pòdcasts en la teva llengua. Avorythm utilitza IA per traduir l’àudio de la pestanya del navegador que seleccionis expressament. Escolta la veu doblada en directe, consulta els subtítols originals i traduïts o mantén l’àudio original i llegeix només la traducció.

Tria entre la reproducció de baixa latència a la pàgina original i el gravador i reproductor sincronitzats. La captura sincronitzada va per davant de la reproducció, mentre que el reproductor independent permet posar el vídeo en pausa, desplaçar-se per la gravació i veure’l a pantalla completa. També pots acabar la gravació manualment.

Controla quatre canals per separat: àudio original, àudio doblat, subtítols originals i subtítols traduïts. Ajusta el volum de tots dos àudios, mou i redimensiona la capa de subtítols, i exporta un vídeo WebM personalitzat i fitxers SRT de subtítols per separat. La gravació convencional opcional també desa les dues pistes d’àudio en format WAV i les dues pistes de subtítols en format SRT.

L’extensió funciona de manera independent, sense l’aplicació d’escriptori, Python, FFmpeg, localhost ni cap dispositiu d’àudio virtual. La interfície actual només està disponible en anglès, persa i xinès simplificat; la llengua de destinació de la traducció es tria per separat entre 79 opcions d’idioma.

Configuració: introdueix a Configuració la teva clau d’API de Gemini, obtinguda a Google AI Studio; dona el consentiment exprés per enviar l’àudio de la pestanya seleccionada a Google Gemini; tria una llengua i prem Inicia. El mode de precisió opcional utilitza Groq Whisper per transcriure, Gemini per traduir el text i Gemini 3.1 Flash Live per generar la veu. Requereix una clau de Groq, un permís opcional d’accés a l’amfitrió i un consentiment separat per a l’àudio.

Privadesa: la captura només comença després que hagis donat el consentiment i premut Inicia. L’àudio de la pestanya seleccionada i les transcripcions s’envien directament als proveïdors d’IA necessaris per al processament sol·licitat, mai al responsable d’Avorythm. Sense anuncis, analítica ni cap servidor intermediari gestionat pel desenvolupador.

Per defecte, les claus d’API només es conserven durant la sessió. L’opció de recordar la clau de cada proveïdor en aquest dispositiu és independent, opcional i està desactivada per defecte. Les còpies desades no se sincronitzen ni són xifrades per l’extensió. Si desactives l’opció de recordar una clau, se’n suprimeix la còpia del dispositiu; si esborres una clau, se’n suprimeixen tant la còpia del dispositiu com la de la sessió.

La gravació convencional amb quatre sortides està desactivada per defecte. El mode sincronitzat grava localment per permetre la reproducció i l’exportació, i només conserva la captura més recent a l’emmagatzematge privat de Chrome. Els fitxers descarregats es desen a Downloads/Avorythm.

Avorythm és gratuït i de codi obert. Les quotes gratuïtes i la disponibilitat dels models dels serveis externs d’IA poden canviar. El processament en directe necessita temps de connexió i no garanteix una latència nul·la ni una traducció perfecta; verifica la informació important. Els continguts protegits amb DRM i les pàgines internes del navegador poden impedir la captura.

Codi font: https://github.com/msmahdinejad/avorythm

Guia d’ús (en anglès): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Política de privadesa: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Novetats de la versió 1.1.17

- Selecció de llengua més senzilla: les llengües més populars apareixen primer, amb variants del xinès i del portuguès clarament diferenciades.
- Nova documentació i nous recursos del projecte en alemany, francès, italià, rus i àrab.
- Imatges de la fitxa actualitzades a partir de la interfície real del producte.
