# Chrome Web Store — Galician (gl)

## Nome

Avorythm — dobraxe e subtítulos en directo con IA

## Descrición breve

Tradución con IA para a pestana que elixas: dobraxe en directo, subtítulos bilingües e un reprodutor sincronizado.

## Descrición detallada

Mira cursos, vídeos e películas ou escoita podcasts na túa lingua. Avorythm usa IA para traducir o audio da pestana do navegador que selecciones expresamente. Escoita a dobraxe en directo, consulta os subtítulos orixinais e traducidos ou conserva o audio orixinal e le só a tradución.

Escolle entre a reprodución de baixa latencia na páxina orixinal e a gravadora con reprodutor sincronizado. A captura sincronizada vai por diante mentres o reprodutor independente permite pausar, avanzar ou retroceder e usar a pantalla completa. Podes finalizar a gravación manualmente.

Controla catro canles de forma independente: audio orixinal, audio dobrado, subtítulos orixinais e subtítulos traducidos. Axusta por separado o volume dos dous audios, move e cambia o tamaño dos subtítulos superpostos e exporta un vídeo WebM personalizado e subtítulos SRT por separado. A gravación convencional opcional tamén garda as dúas pistas de audio en formato WAV e as dúas pistas de subtítulos en formato SRT.

A extensión funciona de maneira independente, sen a aplicación de escritorio, Python, FFmpeg, localhost nin un dispositivo de audio virtual. A interface actual está dispoñible en inglés, persa e chinés simplificado; a lingua de destino da tradución escóllese por separado entre 79 opcións.

Configuración: introduce en Configuración a túa propia clave da API de Gemini de Google AI Studio, dá o teu consentimento expreso para enviar a Google Gemini o audio da pestana seleccionada, escolle unha lingua e preme Iniciar. O modo de precisión opcional usa Groq Whisper para a transcrición, Gemini para traducir o texto e Gemini 3.1 Flash Live para a voz. Require unha clave de Groq, un permiso de acceso ao servidor opcional e un consentimento específico para o audio.

Privacidade: a captura só comeza despois de que deas o teu consentimento e premas Iniciar. O audio e as transcricións da pestana seleccionada envíanse directamente aos provedores de IA necesarios para o procesamento solicitado, nunca á persoa responsable de Avorythm. Sen anuncios, análises de uso nin servidor intermediario xestionado pola persoa desenvolvedora.

Por defecto, as claves da API só se conservan durante a sesión. Podes optar por lembrar neste dispositivo a clave de cada provedor de forma independente; esta opción está desactivada por defecto. As copias gardadas non se sincronizan nin son cifradas pola extensión. Se desactivas esta opción, elimínase a copia do dispositivo; se borras unha clave, elimínanse tanto a copia do dispositivo como a da sesión.

A gravación convencional das catro saídas está desactivada por defecto. O modo sincronizado grava localmente para permitir a reprodución e a exportación, e conserva só a última captura no almacenamento privado de Chrome. Os ficheiros descargados gárdanse en Downloads/Avorythm.

Avorythm é gratuíto e de código aberto. As cotas gratuítas e a dispoñibilidade dos modelos dos servizos externos de IA poden cambiar. O procesamento en directo require tempo de rede e non garante unha latencia nula nin unha tradución perfecta; verifica o contido importante. Os contidos protexidos con DRM e as páxinas internas do navegador poden impedir a captura.

Código fonte: https://github.com/msmahdinejad/avorythm

Guía de uso (en inglés): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Política de privacidade: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Novidades da versión 1.1.16

- Selección de lingua máis sinxela: as linguas máis populares aparecen primeiro, con variantes de chinés e portugués claramente identificadas.
- Nova documentación e novos recursos do proxecto en alemán, francés, italiano, ruso e árabe.
- Imaxes da tenda renovadas a partir da interface real do produto.
