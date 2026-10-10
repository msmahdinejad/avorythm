"""Writes script/<lang>.json for the ten languages beyond en/fa (transcreated narration, on-screen text, demo lines).

  python -I video/films/tutorial/tools/make_scripts.py

Terminology follows site/src/i18n/<lang>.json. Languages without an extension interface (everything except en, fa,
zh-Hans) see the English UI, so UI labels inside the narration stay in English ({id|Label} chips). Numbers spoken as words.
"""
import json
from pathlib import Path

FILM = Path(__file__).resolve().parents[1]
STYLE = ("warm, friendly and clear, like a calm expert showing a friend; natural native pronunciation; a natural, lightly brisk "
         "conversational pace, never rushed and never dragging; short natural pauses only (no long silences between sentences); "
         "a gentle smile in the voice; no dramatic emphasis; English product and button names in the text are pronounced in English")
SRC_EN = ["Every new path begins a new story.", "Listen closely. The mountains are speaking."]

L = {}

L["de"] = dict(dir="ltr", ui="en", target="de", lines={
    "l0": "So richten Sie Avorythm ein – in acht kurzen Schritten.",
    "l1": "Schritt eins. Klicken Sie im Chrome Web Store auf {add|Add to Chrome} und {pin^heften Sie es} an die Symbolleiste. Edge geht auch.",
    "l2": "Schritt zwei. {create^Erstellen Sie} in Google AI Studio einen kostenlosen API-Schlüssel und {copy^kopieren Sie ihn}.",
    "l3a": "Schritt drei. Öffnen Sie die {opens^Einstellungen} von Avorythm.",
    "l3b": "{paste^Fügen Sie den Schlüssel} unter {connect|Connect to Gemini} ein und klicken Sie auf {save|Save}. Er bleibt in Ihrem Browser.",
    "l3c": "Setzen Sie dann {tick^den Haken bei der Einwilligung} für Google Gemini.",
    "l4a": "Schritt vier. Klicken Sie bei einem Video {icon^auf das Avorythm-Symbol} und {pick^wählen Sie Ihre Sprache}. Es gibt {n79^neunundsiebzig}.",
    "l4b": "{onpage|On this page} ist am schnellsten. Der {sync|Synchronized recorder and player} kann zusätzlich pausieren, springen und exportieren.",
    "l5": "Schritt fünf. Klicken Sie auf {start|Start translating} – und {speaks^das Video spricht Ihre Sprache}.",
    "l6a": "Schritt sechs. Schalten Sie jede Ausgabe einzeln ein oder aus: {o1^Originalton}, {o2^Vertonung} und {o3^beide Untertitel}.",
    "l6b": "{card^Die Untertitel} erscheinen auf einer Milchglas-Karte. {drag^Verschieben Sie sie} beliebig und {resize^ändern Sie die Größe}.",
    "l6c": "{balance^Stimmen Sie Original und Vertonung ab}: Die {duck^intelligente Absenkung} macht das Original leiser, solange die Vertonung spricht.",
    "l7a": "Schritt sieben. Im synchronisierten Player können Sie {pause^pausieren}, {seek^springen} und {full^im Vollbild schauen}.",
    "l7b": "Dann {export^exportieren} Sie ein WebM-Video mit SRT-Untertiteln.",
    "l8a": "Schritt acht. Die Desktop-App übersetzt {any^jedes Programm} – unter {os^Windows}, macOS und Linux.",
    "l8b": "Im {studio|File studio} {drop^ziehen Sie eine Datei hinein} und erhalten alle vier Ausgaben {zip^als ein ZIP}.",
    "l9": "Avorythm ist {free^kostenlos und Open Source}. Wenn es Ihnen hilft, {star^geben Sie ihm einen Stern} auf GitHub.",
}, text={
    "eyebrow": "Tutorial", "introTitle": "Avorythm in 8 Schritten einrichten", "introSub": "Von der Installation zum ersten vertonten Video",
    "step": "Schritt {n}", "of": "{n} / 8",
    "titles": ["Erweiterung installieren", "Kostenloser Gemini-Schlüssel", "Verbinden & einwilligen", "Sprache & Modus", "Übersetzung starten", "Nach Ihren Wünschen", "Synchronisierter Player", "Desktop-App"],
    "takeaways": ["Angeheftet, ein Klick entfernt · auch Edge", "Kostenlos · Google AI Studio", "Ihr Schlüssel bleibt im Browser", "79 Sprachen · 2 Modi", "Live-Vertonung direkt auf der Seite", "4 Ausgaben · Mixer · Absenkung", "Export als WebM + SRT", "Jedes Programm · jede Datei · ein ZIP"],
    "languages": "Sprachen", "fastest": "Am schnellsten", "pauseSeekExport": "Pause · Springen · Export", "drag": "Verschieben", "resize": "Größe ändern",
    "ducking": "Intelligente Absenkung", "anyProgram": "Jedes Programm, live", "outroTitle": "Kostenlos & Open Source", "outroStar": "Stern auf GitHub",
    "outroMit": "MIT-Lizenz", "fileVideo": "Eigenes Video"},
    translated=["Jeder neue Weg beginnt eine neue Geschichte.", "Hör genau hin. Die Berge sprechen."])

L["fr"] = dict(dir="ltr", ui="en", target="fr", lines={
    "l0": "Voici comment installer Avorythm, en huit étapes rapides.",
    "l1": "Étape un. Sur le Chrome Web Store, cliquez sur {add|Add to Chrome}, puis {pin^épinglez-le} à la barre d’outils. Ça marche aussi sur Edge.",
    "l2": "Étape deux. Dans Google AI Studio, {create^créez une clé API gratuite}, puis {copy^copiez-la}.",
    "l3a": "Étape trois. Ouvrez les {opens^paramètres} d’Avorythm.",
    "l3b": "{paste^Collez la clé} sous {connect|Connect to Gemini}, puis cliquez sur {save|Save}. Elle reste dans votre navigateur.",
    "l3c": "Cochez ensuite {tick^la case de consentement} pour Google Gemini.",
    "l4a": "Étape quatre. Sur n’importe quelle vidéo, {icon^cliquez sur l’icône Avorythm} et {pick^choisissez votre langue}. Il y en a {n79^soixante-dix-neuf}.",
    "l4b": "{onpage|On this page} est le mode le plus rapide. Le {sync|Synchronized recorder and player} ajoute pause, recherche et export.",
    "l5": "Étape cinq. Cliquez sur {start|Start translating}, et {speaks^la vidéo parle votre langue}.",
    "l6a": "Étape six. Activez ou coupez chaque sortie : {o1^l’audio d’origine}, {o2^le doublage} et {o3^les deux sous-titres}.",
    "l6b": "{card^Les sous-titres} s’affichent sur une carte en verre dépoli. {drag^Déplacez-la} où vous voulez, et {resize^redimensionnez-la}.",
    "l6c": "{balance^Dosez l’original et le doublage} : {duck^l’atténuation intelligente} baisse l’original quand le doublage parle.",
    "l7a": "Étape sept. Le lecteur synchronisé permet de {pause^mettre en pause}, de {seek^naviguer} et de {full^passer en plein écran}.",
    "l7b": "Puis {export^exportez} une vidéo WebM avec des sous-titres SRT.",
    "l8a": "Étape huit. L’application de bureau traduit {any^n’importe quel programme}, sous {os^Windows}, macOS et Linux.",
    "l8b": "Dans {studio|File studio}, {drop^déposez un fichier}, et récupérez les quatre sorties dans {zip^un seul ZIP}.",
    "l9": "Avorythm est {free^gratuit et open source}. S’il vous aide, {star^donnez-lui une étoile} sur GitHub.",
}, text={
    "eyebrow": "Tutoriel", "introTitle": "Installer Avorythm en 8 étapes", "introSub": "De l’installation à votre première vidéo doublée",
    "step": "Étape {n}", "of": "{n} / 8",
    "titles": ["Installer l’extension", "Une clé Gemini gratuite", "Connexion & consentement", "Langue & mode", "Lancer la traduction", "À votre façon", "Lecteur synchronisé", "Application de bureau"],
    "takeaways": ["Épinglé, à un clic · Edge aussi", "Gratuit · Google AI Studio", "Votre clé reste dans le navigateur", "79 langues · 2 modes", "Doublage en direct, sur la page", "4 sorties · mixeur · atténuation", "Export WebM + SRT", "Tout programme · tout fichier · un ZIP"],
    "languages": "langues", "fastest": "Le plus rapide", "pauseSeekExport": "Pause · recherche · export", "drag": "Déplacer", "resize": "Redimensionner",
    "ducking": "Atténuation intelligente", "anyProgram": "Tout programme, en direct", "outroTitle": "Gratuit et open source", "outroStar": "Étoile sur GitHub",
    "outroMit": "Licence MIT", "fileVideo": "Vidéo personnalisée"},
    translated=["Chaque nouveau chemin commence une nouvelle histoire.", "Écoute bien. Les montagnes parlent."])

L["es"] = dict(dir="ltr", ui="en", target="es", lines={
    "l0": "Así se configura Avorythm, en ocho pasos rápidos.",
    "l1": "Paso uno. En Chrome Web Store, haz clic en {add|Add to Chrome} y luego {pin^fíjalo} en la barra de herramientas. También funciona en Edge.",
    "l2": "Paso dos. En Google AI Studio, {create^crea una clave de API gratuita} y {copy^cópiala}.",
    "l3a": "Paso tres. Abre los {opens^ajustes} de Avorythm.",
    "l3b": "{paste^Pega la clave} en {connect|Connect to Gemini} y pulsa {save|Save}. Se queda en tu navegador.",
    "l3c": "Después, {tick^marca la casilla de consentimiento} para Google Gemini.",
    "l4a": "Paso cuatro. En cualquier video, {icon^haz clic en el icono de Avorythm} y {pick^elige tu idioma}. Hay {n79^setenta y nueve}.",
    "l4b": "{onpage|On this page} es el modo más rápido. El {sync|Synchronized recorder and player} añade pausa, avance y exportación.",
    "l5": "Paso cinco. Pulsa {start|Start translating}, y {speaks^el video habla tu idioma}.",
    "l6a": "Paso seis. Activa o desactiva cada salida: {o1^audio original}, {o2^audio doblado} y {o3^los dos subtítulos}.",
    "l6b": "{card^Los subtítulos} aparecen en una tarjeta de cristal esmerilado. {drag^Arrástrala} adonde quieras y {resize^cambia su tamaño}.",
    "l6c": "{balance^Equilibra el original y el doblaje}: la {duck^atenuación inteligente} baja el original mientras habla el doblaje.",
    "l7a": "Paso siete. El reproductor sincronizado te deja {pause^pausar}, {seek^avanzar o retroceder} y {full^ver a pantalla completa}.",
    "l7b": "Luego, {export^exporta} un video WebM con subtítulos SRT.",
    "l8a": "Paso ocho. La app de escritorio traduce {any^cualquier programa}, en {os^Windows}, macOS y Linux.",
    "l8b": "En {studio|File studio}, {drop^suelta un archivo} y llévate las cuatro salidas en {zip^un solo ZIP}.",
    "l9": "Avorythm es {free^gratis y de código abierto}. Si te ayuda, {star^dale una estrella} en GitHub.",
}, text={
    "eyebrow": "Tutorial", "introTitle": "Configura Avorythm en 8 pasos", "introSub": "De la instalación a tu primer video doblado",
    "step": "Paso {n}", "of": "{n} / 8",
    "titles": ["Instala la extensión", "Clave gratis de Gemini", "Conecta y autoriza", "Idioma y modo", "Empieza a traducir", "A tu manera", "Reproductor sincronizado", "App de escritorio"],
    "takeaways": ["Fijado, a un clic · también Edge", "Gratis · Google AI Studio", "Tu clave se queda en tu navegador", "79 idiomas · 2 modos", "Doblaje en vivo, en la misma página", "4 salidas · mezclador · atenuación", "Exporta WebM + SRT", "Cualquier programa · cualquier archivo · un ZIP"],
    "languages": "idiomas", "fastest": "El más rápido", "pauseSeekExport": "Pausa · avance · exportación", "drag": "Arrastrar", "resize": "Cambiar tamaño",
    "ducking": "Atenuación inteligente", "anyProgram": "Cualquier programa, en vivo", "outroTitle": "Gratis y de código abierto", "outroStar": "Estrella en GitHub",
    "outroMit": "Licencia MIT", "fileVideo": "Video personalizado"},
    translated=["Cada nuevo camino empieza una nueva historia.", "Escucha con atención. Las montañas están hablando."])

L["pt"] = dict(dir="ltr", ui="en", target="pt", lines={
    "l0": "Veja como configurar o Avorythm, em oito passos rápidos.",
    "l1": "Passo um. Na Chrome Web Store, clique em {add|Add to Chrome} e depois {pin^fixe-o} na barra de ferramentas. Também funciona no Edge.",
    "l2": "Passo dois. No Google AI Studio, {create^crie uma chave de API gratuita} e {copy^copie-a}.",
    "l3a": "Passo três. Abra as {opens^configurações} do Avorythm.",
    "l3b": "{paste^Cole a chave} em {connect|Connect to Gemini} e clique em {save|Save}. Ela fica no seu navegador.",
    "l3c": "Depois, {tick^marque a caixa de consentimento} do Google Gemini.",
    "l4a": "Passo quatro. Em qualquer vídeo, {icon^clique no ícone do Avorythm} e {pick^escolha seu idioma}. São {n79^setenta e nove}.",
    "l4b": "{onpage|On this page} é o modo mais rápido. O {sync|Synchronized recorder and player} acrescenta pausa, avanço e exportação.",
    "l5": "Passo cinco. Clique em {start|Start translating}, e {speaks^o vídeo fala o seu idioma}.",
    "l6a": "Passo seis. Ligue ou desligue cada saída: {o1^áudio original}, {o2^áudio dublado} e {o3^as duas legendas}.",
    "l6b": "{card^As legendas} aparecem num cartão de vidro fosco. {drag^Arraste-o} para onde quiser e {resize^mude o tamanho}.",
    "l6c": "{balance^Equilibre o original e a dublagem}: a {duck^redução inteligente} abaixa o original enquanto a dublagem fala.",
    "l7a": "Passo sete. O player sincronizado permite {pause^pausar}, {seek^avançar} e {full^ver em tela cheia}.",
    "l7b": "Depois, {export^exporte} um vídeo WebM com legendas SRT.",
    "l8a": "Passo oito. O app para computador traduz {any^qualquer programa}, no {os^Windows}, macOS e Linux.",
    "l8b": "No {studio|File studio}, {drop^solte um arquivo} e baixe as quatro saídas em {zip^um único ZIP}.",
    "l9": "O Avorythm é {free^grátis e de código aberto}. Se ele te ajudar, {star^dê uma estrela} no GitHub.",
}, text={
    "eyebrow": "Tutorial", "introTitle": "Configure o Avorythm em 8 passos", "introSub": "Da instalação ao seu primeiro vídeo dublado",
    "step": "Passo {n}", "of": "{n} / 8",
    "titles": ["Instale a extensão", "Chave gratuita do Gemini", "Conectar e autorizar", "Idioma e modo", "Comece a traduzir", "Do seu jeito", "Player sincronizado", "App para computador"],
    "takeaways": ["Fixado, a um clique · Edge também", "Grátis · Google AI Studio", "Sua chave fica no seu navegador", "79 idiomas · 2 modos", "Dublagem ao vivo, na própria página", "4 saídas · mixer · redução inteligente", "Exporte WebM + SRT", "Qualquer programa · qualquer arquivo · um ZIP"],
    "languages": "idiomas", "fastest": "O mais rápido", "pauseSeekExport": "Pausa · avanço · exportação", "drag": "Arrastar", "resize": "Redimensionar",
    "ducking": "Redução inteligente", "anyProgram": "Qualquer programa, ao vivo", "outroTitle": "Grátis e código aberto", "outroStar": "Estrela no GitHub",
    "outroMit": "Licença MIT", "fileVideo": "Vídeo personalizado"},
    translated=["Cada novo caminho começa uma nova história.", "Escute com atenção. As montanhas estão falando."])

L["ru"] = dict(dir="ltr", ui="en", target="ru", lines={
    "l0": "Вот как настроить Avorythm за восемь быстрых шагов.",
    "l1": "Шаг первый. В Chrome Web Store нажмите {add|Add to Chrome}, а затем {pin^закрепите значок} на панели инструментов. В Edge тоже работает.",
    "l2": "Шаг второй. В Google AI Studio {create^создайте бесплатный ключ API} и {copy^скопируйте его}.",
    "l3a": "Шаг третий. Откройте {opens^настройки} Avorythm.",
    "l3b": "{paste^Вставьте ключ} в разделе {connect|Connect to Gemini} и нажмите {save|Save}. Он остаётся в вашем браузере.",
    "l3c": "Затем {tick^отметьте согласие} для Google Gemini.",
    "l4a": "Шаг четвёртый. На любом видео {icon^нажмите значок Avorythm} и {pick^выберите язык}. Их {n79^семьдесят девять}.",
    "l4b": "{onpage|On this page} — самый быстрый режим. {sync|Synchronized recorder and player} добавляет паузу, перемотку и экспорт.",
    "l5": "Шаг пятый. Нажмите {start|Start translating} — и {speaks^видео заговорит на вашем языке}.",
    "l6a": "Шаг шестой. Включайте и отключайте каждый канал: {o1^оригинальный звук}, {o2^озвучку} и {o3^оба вида субтитров}.",
    "l6b": "{card^Субтитры} появляются на карточке из матового стекла. {drag^Перетащите её} куда угодно и {resize^измените размер}.",
    "l6c": "{balance^Настройте баланс оригинала и озвучки}: {duck^умное приглушение} делает оригинал тише, пока звучит озвучка.",
    "l7a": "Шаг седьмой. В синхронизированном плеере можно {pause^поставить паузу}, {seek^перемотать} и {full^развернуть на весь экран}.",
    "l7b": "Затем {export^экспортируйте} видео в WebM с субтитрами SRT.",
    "l8a": "Шаг восьмой. Приложение для компьютера переводит звук {any^любой программы} — в {os^Windows}, macOS и Linux.",
    "l8b": "В {studio|File studio} {drop^перетащите файл} и получите все четыре канала {zip^одним ZIP-архивом}.",
    "l9": "Avorythm {free^бесплатный и с открытым кодом}. Если он вам помог, {star^поставьте звезду} на GitHub.",
}, text={
    "eyebrow": "Видеоурок", "introTitle": "Настройка Avorythm за 8 шагов", "introSub": "От установки до первого видео с озвучкой",
    "step": "Шаг {n}", "of": "{n} / 8",
    "titles": ["Установите расширение", "Бесплатный ключ Gemini", "Подключение и согласие", "Язык и режим", "Запуск перевода", "Настройте под себя", "Синхронизированный плеер", "Приложение для компьютера"],
    "takeaways": ["Закреплено — в один клик · и в Edge", "Бесплатно · Google AI Studio", "Ключ остаётся в вашем браузере", "79 языков · 2 режима", "Озвучка вживую, прямо на странице", "4 канала · микшер · приглушение", "Экспорт WebM + SRT", "Любая программа · любой файл · один ZIP"],
    "languages": "языков", "fastest": "Самый быстрый", "pauseSeekExport": "Пауза · перемотка · экспорт", "drag": "Перетащить", "resize": "Изменить размер",
    "ducking": "Умное приглушение", "anyProgram": "Любая программа, вживую", "outroTitle": "Бесплатно и с открытым кодом", "outroStar": "Звезда на GitHub",
    "outroMit": "Лицензия MIT", "fileVideo": "Своё видео"},
    translated=["Каждый новый путь начинает новую историю.", "Прислушайся. Горы говорят."])

L["tr"] = dict(dir="ltr", ui="en", target="tr", lines={
    "l0": "Avorythm’i sekiz kısa adımda nasıl kuracağınıza bakalım.",
    "l1": "Birinci adım. Chrome Web Store’da {add|Add to Chrome} düğmesine tıklayın, ardından {pin^araç çubuğuna sabitleyin}. Edge’de de çalışır.",
    "l2": "İkinci adım. Google AI Studio’da {create^ücretsiz bir API anahtarı oluşturun} ve {copy^kopyalayın}.",
    "l3a": "Üçüncü adım. Avorythm’in {opens^ayarlarını açın}.",
    "l3b": "{paste^Anahtarı} {connect|Connect to Gemini} bölümüne yapıştırın ve {save|Save} düğmesine basın. Anahtar tarayıcınızda kalır.",
    "l3c": "Ardından Google Gemini için {tick^onay kutusunu işaretleyin}.",
    "l4a": "Dördüncü adım. Herhangi bir videoda {icon^Avorythm simgesine tıklayın} ve {pick^dilinizi seçin}. Tam {n79^yetmiş dokuz} dil var.",
    "l4b": "{onpage|On this page} en hızlı moddur. {sync|Synchronized recorder and player} ise duraklatma, sarma ve dışa aktarma ekler.",
    "l5": "Beşinci adım. {start|Start translating} düğmesine basın; {speaks^video artık sizin dilinizde konuşur}.",
    "l6a": "Altıncı adım. Her çıkışı ayrı ayrı açıp kapatın: {o1^özgün ses}, {o2^seslendirme} ve {o3^iki altyazı}.",
    "l6b": "{card^Altyazılar} buzlu cam bir kartta görünür. {drag^Kartı istediğiniz yere sürükleyin} ve {resize^boyutunu değiştirin}.",
    "l6c": "{balance^Özgün ses ile seslendirmeyi dengeleyin}; {duck^akıllı kısma}, seslendirme konuşurken özgün sesi kısar.",
    "l7a": "Yedinci adım. Senkronize oynatıcıda {pause^duraklatabilir}, {seek^ileri geri sarabilir} ve {full^tam ekrana geçebilirsiniz}.",
    "l7b": "Sonra {export^WebM} videosunu SRT altyazılarıyla dışa aktarın.",
    "l8a": "Sekizinci adım. Masaüstü uygulaması {any^her programın sesini} çevirir; {os^Windows}, macOS ve Linux’ta.",
    "l8b": "{studio|File studio} bölümüne {drop^bir dosya bırakın} ve dört çıkışın hepsini {zip^tek bir ZIP} olarak alın.",
    "l9": "Avorythm {free^ücretsiz ve açık kaynaklı}. İşinize yaradıysa GitHub’da {star^ona bir yıldız verin}.",
}, text={
    "eyebrow": "Eğitim", "introTitle": "Avorythm’i 8 adımda kurun", "introSub": "Kurulumdan ilk seslendirilmiş videonuza",
    "step": "Adım {n}", "of": "{n} / 8",
    "titles": ["Uzantıyı kurun", "Ücretsiz Gemini anahtarı", "Bağlanın ve onaylayın", "Dil ve mod", "Çeviriyi başlatın", "Size göre", "Senkronize oynatıcı", "Masaüstü uygulaması"],
    "takeaways": ["Sabitlendi, bir tık uzakta · Edge de", "Ücretsiz · Google AI Studio", "Anahtarınız tarayıcınızda kalır", "79 dil · 2 mod", "Canlı seslendirme, aynı sayfada", "4 çıkış · mikser · akıllı kısma", "WebM + SRT dışa aktarın", "Her program · her dosya · tek ZIP"],
    "languages": "dil", "fastest": "En hızlı", "pauseSeekExport": "Duraklat · sar · dışa aktar", "drag": "Sürükle", "resize": "Boyutlandır",
    "ducking": "Akıllı kısma", "anyProgram": "Her program, canlı", "outroTitle": "Ücretsiz ve açık kaynak", "outroStar": "GitHub’da yıldız ver",
    "outroMit": "MIT lisansı", "fileVideo": "Özel video"},
    translated=["Her yeni yol, yeni bir hikâye başlatır.", "Dikkatle dinle. Dağlar konuşuyor."])

L["ar"] = dict(dir="rtl", ui="en", target="ar", lines={
    "l0": "إليك كيف تُعِدّ Avorythm في ثماني خطوات سريعة.",
    "l1": "الخطوة الأولى: في Chrome Web Store اضغط {add|Add to Chrome}، ثم {pin^ثبّته} في شريط الأدوات. ويعمل على Edge أيضًا.",
    "l2": "الخطوة الثانية: في Google AI Studio {create^أنشئ مفتاح API مجانيًا} ثم {copy^انسخه}.",
    "l3a": "الخطوة الثالثة: افتح {opens^إعدادات} Avorythm.",
    "l3b": "{paste^الصق المفتاح} في {connect|Connect to Gemini} واضغط {save|Save}. يبقى المفتاح في متصفحك.",
    "l3c": "ثم {tick^فعّل خانة الموافقة} الخاصة بـ Google Gemini.",
    "l4a": "الخطوة الرابعة: على أي فيديو {icon^اضغط أيقونة Avorythm} ثم {pick^اختر لغتك}، فهناك {n79^تسع وسبعون} لغة.",
    "l4b": "{onpage|On this page} هو الوضع الأسرع، أما {sync|Synchronized recorder and player} فيضيف الإيقاف المؤقت والتنقل والتصدير.",
    "l5": "الخطوة الخامسة: اضغط {start|Start translating}، {speaks^فيتحدث الفيديو بلغتك}.",
    "l6a": "الخطوة السادسة: شغّل كل مخرج أو أوقفه: {o1^الصوت الأصلي}، و{o2^صوت الدبلجة}، و{o3^الترجمتان النصيتان}.",
    "l6b": "{card^تظهر الترجمة النصية} على بطاقة زجاجية. {drag^اسحبها} إلى أي مكان، و{resize^غيّر حجمها}.",
    "l6c": "{balance^وازن بين الصوت الأصلي والدبلجة}؛ {duck^فالخفض الذكي} يُخفض الأصلي أثناء كلام الدبلجة.",
    "l7a": "الخطوة السابعة: يتيح لك المشغّل المتزامن {pause^الإيقاف المؤقت}، و{seek^التنقل}، و{full^ملء الشاشة}.",
    "l7b": "ثم {export^صدّر} فيديو WebM مع ترجمة SRT.",
    "l8a": "الخطوة الثامنة: يترجم تطبيق سطح المكتب صوت {any^أي برنامج}، على {os^Windows} وmacOS وLinux.",
    "l8b": "في {studio|File studio} {drop^أفلِت ملفًا}، واحصل على المخرجات الأربعة في {zip^ملف ZIP واحد}.",
    "l9": "Avorythm {free^مجاني ومفتوح المصدر}. وإن أفادك، {star^امنحه نجمة} على GitHub.",
}, text={
    "eyebrow": "درس تعليمي", "introTitle": "أعِدّ Avorythm في 8 خطوات", "introSub": "من التثبيت إلى أول فيديو مدبلج",
    "step": "الخطوة {n}", "of": "{n} من 8",
    "titles": ["ثبّت الإضافة", "مفتاح Gemini مجاني", "الاتصال والموافقة", "اللغة والوضع", "ابدأ الترجمة", "على ذوقك", "المشغّل المتزامن", "تطبيق سطح المكتب"],
    "takeaways": ["مثبّتة على بُعد نقرة · وتعمل على Edge", "مجاني · Google AI Studio", "مفتاحك يبقى في متصفحك", "79 لغة · وضعان", "دبلجة مباشرة على الصفحة نفسها", "4 مخرجات · مازج · خفض ذكي", "تصدير WebM + SRT", "أي برنامج · أي ملف · ZIP واحد"],
    "languages": "لغة", "fastest": "الأسرع", "pauseSeekExport": "إيقاف · تنقل · تصدير", "drag": "اسحب", "resize": "غيّر الحجم",
    "ducking": "خفض ذكي", "anyProgram": "أي برنامج، مباشرةً", "outroTitle": "مجاني ومفتوح المصدر", "outroStar": "نجمة على GitHub",
    "outroMit": "رخصة MIT", "fileVideo": "فيديو مخصّص"},
    translated=["كل طريق جديد يبدأ قصة جديدة.", "أنصت جيدًا. الجبال تتكلم."])

L["hi"] = dict(dir="ltr", ui="en", target="hi", lines={
    "l0": "आइए, आठ आसान चरणों में Avorythm सेट अप करें।",
    "l1": "पहला चरण। Chrome Web Store पर {add|Add to Chrome} पर क्लिक करें, फिर इसे टूलबार में {pin^पिन करें}। यह Edge में भी चलता है।",
    "l2": "दूसरा चरण। Google AI Studio में {create^एक मुफ़्त API कुंजी बनाएँ} और {copy^उसे कॉपी करें}।",
    "l3a": "तीसरा चरण। Avorythm की {opens^सेटिंग्स खोलें}।",
    "l3b": "{paste^कुंजी को} {connect|Connect to Gemini} में चिपकाएँ और {save|Save} दबाएँ। यह आपके ब्राउज़र में ही रहती है।",
    "l3c": "फिर Google Gemini के लिए {tick^सहमति वाले बॉक्स पर टिक करें}।",
    "l4a": "चौथा चरण। किसी भी वीडियो पर {icon^Avorythm आइकन पर क्लिक करें} और {pick^अपनी भाषा चुनें}। कुल {n79^उन्यासी} भाषाएँ हैं।",
    "l4b": "{onpage|On this page} सबसे तेज़ मोड है। {sync|Synchronized recorder and player} में रोकना, आगे-पीछे जाना और एक्सपोर्ट भी मिलता है।",
    "l5": "पाँचवाँ चरण। {start|Start translating} दबाएँ, और {speaks^वीडियो आपकी भाषा में बोलने लगेगा}।",
    "l6a": "छठा चरण। हर आउटपुट को अलग से चालू या बंद करें: {o1^मूल ऑडियो}, {o2^डब ऑडियो} और {o3^दोनों सबटाइटल}।",
    "l6b": "{card^सबटाइटल} धुंधले काँच जैसे कार्ड पर दिखते हैं। {drag^इसे कहीं भी खिसकाएँ} और {resize^आकार बदलें}।",
    "l6c": "{balance^मूल ऑडियो और डब का संतुलन बनाएँ}; {duck^स्मार्ट डकिंग} डब के बोलते समय मूल आवाज़ धीमी कर देती है।",
    "l7a": "सातवाँ चरण। सिंक्रनाइज़ किए गए प्लेयर में आप {pause^रोक सकते हैं}, {seek^आगे-पीछे जा सकते हैं} और {full^फ़ुलस्क्रीन देख सकते हैं}।",
    "l7b": "फिर SRT सबटाइटल के साथ {export^WebM} वीडियो एक्सपोर्ट करें।",
    "l8a": "आठवाँ चरण। डेस्कटॉप ऐप {any^किसी भी प्रोग्राम} की आवाज़ का अनुवाद करता है, {os^Windows}, macOS और Linux पर।",
    "l8b": "{studio|File studio} में {drop^कोई फ़ाइल डालें}, और चारों आउटपुट {zip^एक ZIP में} पाएँ।",
    "l9": "Avorythm {free^मुफ़्त और ओपन सोर्स} है। अगर यह काम आए, तो GitHub पर {star^इसे एक स्टार दें}।",
}, text={
    "eyebrow": "ट्यूटोरियल", "introTitle": "8 चरणों में Avorythm सेट अप करें", "introSub": "इंस्टॉल से लेकर पहले डब वीडियो तक",
    "step": "चरण {n}", "of": "{n} / 8",
    "titles": ["एक्सटेंशन इंस्टॉल करें", "मुफ़्त Gemini कुंजी", "कनेक्ट करें, सहमति दें", "भाषा और मोड", "अनुवाद शुरू करें", "अपने हिसाब से", "सिंक्रनाइज़ प्लेयर", "डेस्कटॉप ऐप"],
    "takeaways": ["पिन हो गया, बस एक क्लिक दूर · Edge में भी", "मुफ़्त · Google AI Studio", "कुंजी आपके ब्राउज़र में ही रहती है", "79 भाषाएँ · 2 मोड", "लाइव डब, उसी पेज पर", "4 आउटपुट · मिक्सर · स्मार्ट डकिंग", "WebM + SRT एक्सपोर्ट", "कोई भी प्रोग्राम · कोई भी फ़ाइल · एक ZIP"],
    "languages": "भाषाएँ", "fastest": "सबसे तेज़", "pauseSeekExport": "रोकें · आगे-पीछे · एक्सपोर्ट", "drag": "खिसकाएँ", "resize": "आकार बदलें",
    "ducking": "स्मार्ट डकिंग", "anyProgram": "कोई भी प्रोग्राम, लाइव", "outroTitle": "मुफ़्त और ओपन सोर्स", "outroStar": "GitHub पर स्टार दें",
    "outroMit": "MIT लाइसेंस", "fileVideo": "कस्टम वीडियो"},
    translated=["हर नया रास्ता एक नई कहानी शुरू करता है।", "ध्यान से सुनो। पहाड़ बोल रहे हैं।"])

L["ja"] = dict(dir="ltr", ui="en", target="ja", lines={
    "l0": "Avorythm のセットアップを、八つのかんたんなステップでご紹介します。",
    "l1": "ステップ一。Chrome Web Store で {add|Add to Chrome} をクリックし、ツールバーに{pin^ピン留めします}。Edge でも使えます。",
    "l2": "ステップ二。Google AI Studio で{create^無料の API キーを作成し}、{copy^コピーします}。",
    "l3a": "ステップ三。Avorythm の{opens^設定を開きます}。",
    "l3b": "{paste^キーを} {connect|Connect to Gemini} に貼り付けて、{save|Save} を押します。キーはブラウザの中だけに保存されます。",
    "l3c": "続いて、Google Gemini への{tick^同意にチェックを入れます}。",
    "l4a": "ステップ四。好きな動画で{icon^Avorythm のアイコンをクリックし}、{pick^言語を選びます}。対応言語は{n79^七十九}です。",
    "l4b": "{onpage|On this page} がいちばん速いモード。{sync|Synchronized recorder and player} なら、一時停止、シーク、書き出しもできます。",
    "l5": "ステップ五。{start|Start translating} を押すと、{speaks^動画があなたの言語で話し始めます}。",
    "l6a": "ステップ六。出力はひとつずつオン・オフできます。{o1^元の音声}、{o2^吹き替え}、そして{o3^二つの字幕}。",
    "l6b": "{card^字幕は}すりガラス風のカードに表示されます。{drag^好きな場所へドラッグして}、{resize^サイズも変えられます}。",
    "l6c": "{balance^元の音声と吹き替えのバランスを調整}。{duck^スマートダッキング}が、吹き替えの間は元の音声を下げてくれます。",
    "l7a": "ステップ七。同期プレーヤーでは、{pause^一時停止}、{seek^シーク}、{full^全画面表示}ができます。",
    "l7b": "そして、SRT 字幕付きの {export^WebM} 動画を書き出せます。",
    "l8a": "ステップ八。デスクトップアプリは、{any^あらゆるプログラム}の音声を翻訳します。{os^Windows}、macOS、Linux に対応。",
    "l8b": "{studio|File studio} に{drop^ファイルをドロップすれば}、四つの出力を{zip^一つの ZIP} で受け取れます。",
    "l9": "Avorythm は{free^無料のオープンソース}です。役に立ったら、GitHub で{star^スターをお願いします}。",
}, text={
    "eyebrow": "チュートリアル", "introTitle": "8ステップで Avorythm をセットアップ", "introSub": "インストールから、はじめての吹き替え動画まで",
    "step": "ステップ {n}", "of": "{n} / 8",
    "titles": ["拡張機能をインストール", "無料の Gemini キー", "接続と同意", "言語とモード", "翻訳を開始", "自分好みに", "同期プレーヤー", "デスクトップアプリ"],
    "takeaways": ["ピン留め完了、ワンクリックで · Edge でも", "無料 · Google AI Studio", "キーはブラウザの中だけに", "79言語 · 2つのモード", "ページ上でライブ吹き替え", "4つの出力 · ミキサー · ダッキング", "WebM + SRT を書き出し", "どのプログラムも · どのファイルも · ZIP ひとつ"],
    "languages": "言語", "fastest": "最速", "pauseSeekExport": "一時停止 · シーク · 書き出し", "drag": "ドラッグ", "resize": "サイズ変更",
    "ducking": "スマートダッキング", "anyProgram": "あらゆるプログラムをライブで", "outroTitle": "無料のオープンソース", "outroStar": "GitHub でスターを",
    "outroMit": "MIT ライセンス", "fileVideo": "カスタム動画"},
    translated=["新しい道は、新しい物語の始まり。", "耳を澄ませて。山が語りかけている。"])

L["zh"] = dict(dir="ltr", ui="zh-Hans", target="zh", lines={
    "l0": "下面用八个简单步骤，带你设置 Avorythm。",
    "l1": "第一步：在 Chrome Web Store 点击{add|添加至 Chrome}，然后把它{pin^固定到工具栏}。Edge 也一样能用。",
    "l2": "第二步：在 Google AI Studio {create^创建一个免费的 API 密钥}，然后{copy^复制下来}。",
    "l3a": "第三步：{opens^打开} Avorythm 的设置。",
    "l3b": "{paste^把密钥}粘贴到{connect|连接到 Gemini}，再点击{save|保存}。密钥只保存在你的浏览器里。",
    "l3c": "接着，{tick^勾选}发送音频到 Google Gemini 的授权选项。",
    "l4a": "第四步：在任意视频页面{icon^点击 Avorythm 图标}，{pick^选择你的语言}，一共有{n79^七十九}种。",
    "l4b": "{onpage|在本页}速度最快；{sync|同步录制器与播放器}还能暂停、跳转和导出。",
    "l5": "第五步：点击{start|开始翻译}，{speaks^视频就会说你的语言}。",
    "l6a": "第六步：每一路输出都能单独开关：{o1^原始音频}、{o2^配音}，以及{o3^两种字幕}。",
    "l6b": "{card^字幕}显示在一张毛玻璃卡片上，{drag^可以随意拖动}，{resize^也能调整大小}。",
    "l6c": "{balance^调节原声和配音的比例}；{duck^智能压低原声}会在配音说话时自动降低原声。",
    "l7a": "第七步：在同步播放器里，可以{pause^暂停}、{seek^跳转}，还能{full^全屏观看}。",
    "l7b": "然后{export^导出}带 SRT 字幕的 WebM 视频。",
    "l8a": "第八步：桌面应用可以翻译{any^任何程序}的声音，支持{os^Windows}、macOS 和 Linux。",
    "l8b": "在{studio|文件工作室}里{drop^拖入一个文件}，四路输出会打包成{zip^一个 ZIP}。",
    "l9": "Avorythm {free^免费开源}。如果它帮到了你，请在 GitHub 上{star^给它一颗星}。",
}, text={
    "eyebrow": "使用教程", "introTitle": "8 步设置 Avorythm", "introSub": "从安装到第一个配音视频",
    "step": "第 {n} 步", "of": "{n} / 8",
    "titles": ["安装扩展", "免费的 Gemini 密钥", "连接并授权", "选择语言和模式", "开始翻译", "按你的喜好", "同步播放器", "桌面应用"],
    "takeaways": ["已固定，一键即达 · Edge 也行", "免费 · Google AI Studio", "密钥只留在你的浏览器里", "79 种语言 · 2 种模式", "页面上的实时配音", "4 路输出 · 混音 · 智能压低", "导出 WebM + SRT", "任何程序 · 任何文件 · 一个 ZIP"],
    "languages": "种语言", "fastest": "最快", "pauseSeekExport": "暂停 · 跳转 · 导出", "drag": "拖动", "resize": "调整大小",
    "ducking": "智能压低原声", "anyProgram": "任何程序，实时翻译", "outroTitle": "免费且开源", "outroStar": "在 GitHub 上点星",
    "outroMit": "MIT 许可证", "fileVideo": "定制视频"},
    translated=["每一条新路，都开启一个新故事。", "仔细听，群山在说话。"])


def main():
    for lang, d in L.items():
        p = FILM / "script" / f"{lang}.json"
        old = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
        out = {
            "lang": lang, "dir": d["dir"], "ui": d["ui"], "target": d["target"],
            "voice": old.get("voice") or {"name": "Sulafat", "style": STYLE, "pace": 0.07},
            "lines": d["lines"],
            "text": {**d["text"], "copied": "Copied"},
            "demo": {"sourceLang": "en", "source": SRC_EN, "translated": d["translated"]},
        }
        p.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
        print("wrote", p.name)


if __name__ == "__main__":
    main()
