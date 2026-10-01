# Chrome Web Store — Spanish (es)

## Nombre

Avorythm — doblaje y subtítulos en directo con IA

## Descripción breve

Traducción con IA para la pestaña seleccionada: doblaje en directo, subtítulos bilingües y reproductor sincronizado.

## Descripción detallada

Mira cursos, vídeos y películas, o escucha podcasts en tu idioma. Avorythm utiliza IA para traducir el audio de la pestaña del navegador que selecciones explícitamente. Escucha el habla doblada en directo, muestra subtítulos originales y traducidos, o conserva el audio original y lee solo la traducción.

Elige una reproducción de baja latencia en la página original o en la grabadora y el reproductor sincronizados. La captura sincronizada se adelanta, mientras que el reproductor independiente permite pausar, avanzar o retroceder y activar la pantalla completa. La grabación puede finalizarse manualmente.

Controla cuatro canales de forma independiente: audio original, audio doblado, subtítulos originales y subtítulos traducidos. Mezcla ambos niveles de audio, mueve y cambia el tamaño de la superposición de subtítulos, y exporta vídeos WebM personalizados y subtítulos SRT independientes. La grabación normal opcional también guarda ambas pistas de audio como WAV y ambas pistas de subtítulos como SRT.

La extensión funciona de forma independiente, sin la aplicación de escritorio, Python, FFmpeg, localhost ni un dispositivo de audio virtual. La interfaz actual está disponible en inglés, persa y chino simplificado; el idioma de destino de la traducción se selecciona de forma independiente entre 79 opciones.

Configuración: introduce en Configuración tu propia clave de API de Gemini de Google AI Studio, acepta explícitamente enviar a Google Gemini el audio de la pestaña seleccionada, elige un idioma y pulsa Iniciar. El modo preciso opcional utiliza Groq Whisper para la transcripción, Gemini para la traducción de texto y Gemini 3.1 Flash Live para el habla. Requiere una clave de Groq, permiso de host opcional y un consentimiento independiente para el audio.

Privacidad: la captura comienza solo después de otorgar el consentimiento y pulsar Iniciar. El audio de la pestaña seleccionada y las transcripciones se envían directamente a los proveedores de IA necesarios para el procesamiento solicitado, nunca al responsable de Avorythm. No hay anuncios, analítica ni un servidor de retransmisión operado por el desarrollador.

Las claves de API solo se conservan durante la sesión de forma predeterminada. Recordar la clave de cada proveedor en este dispositivo es opcional de forma independiente y está desactivado por defecto. Las copias almacenadas no se sincronizan ni están cifradas por la extensión. Al desactivar la opción de recordar, se elimina la copia del dispositivo; al borrar una clave, se eliminan tanto la copia del dispositivo como la de la sesión.

La grabación normal de cuatro salidas está desactivada por defecto. El modo sincronizado graba localmente para la reproducción y la exportación, y conserva únicamente la captura más reciente en el almacenamiento privado de Chrome. Los archivos descargados se guardan en Downloads/Avorythm.

Avorythm es gratuito y de código abierto. Las cuotas gratuitas y la disponibilidad de modelos de los servicios externos de IA pueden cambiar. El procesamiento en directo necesita tiempo de red y no garantiza una latencia nula ni una traducción perfecta; verifica el contenido importante. Los contenidos protegidos por DRM y las páginas internas del navegador pueden impedir la captura.

Fuente: https://github.com/msmahdinejad/avorythm

Guía del usuario (inglés): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Política de privacidad: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Novedades de la versión 1.1.15

- Selección de idioma más sencilla: los idiomas populares aparecen primero, con variantes claras de chino y portugués.
- Nueva documentación y nuevos recursos del proyecto en alemán, francés, italiano, ruso y árabe.
- Imágenes renovadas de la tienda basadas en la interfaz real del producto.
