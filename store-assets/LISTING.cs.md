# Chrome Web Store — Czech (cs)

## Název

Avorythm — živý dabing a titulky s AI

## Krátký popis

Překlad zvuku z vybrané karty pomocí AI: živý dabing, dvojjazyčné titulky a synchronizovaný přehrávač.

## Podrobný popis

Sledujte kurzy, videa a filmy nebo poslouchejte podcasty ve svém jazyce. Avorythm pomocí AI překládá zvuk z karty prohlížeče, kterou výslovně vyberete. Poslouchejte živě dabovanou řeč, zobrazte si titulky v původním jazyce i v překladu, nebo ponechte původní zvuk a čtěte jen překlad.

Vyberte si přehrávání s nízkou latencí na původní stránce nebo synchronizovaný záznam a přehrávač. Při synchronizovaném záznamu se obsah nahrává s předstihem, zatímco v samostatném přehrávači můžete přehrávání pozastavit, přetáčet a přepnout na celou obrazovku. Nahrávání lze ukončit ručně.

Ovládejte nezávisle čtyři kanály: původní zvuk, dabovaný zvuk, titulky v původním jazyce a přeložené titulky. Nastavte hlasitost obou zvukových stop, přesuňte a změňte velikost překryvných titulků a exportujte upravené video WebM a samostatné titulky SRT. Volitelné běžné nahrávání ukládá také obě zvukové stopy jako WAV a obě stopy titulků jako SRT.

Rozšíření funguje samostatně, bez aplikace pro počítač, Python, FFmpeg, localhost i virtuálního zvukového zařízení. Rozhraní je dostupné v angličtině, perštině a zjednodušené čínštině; cílový jazyk překladu se volí nezávisle z 79 jazykových položek.

Nastavení: v nastavení zadejte vlastní klíč API Gemini ze služby Google AI Studio, výslovně udělte souhlas s odesíláním zvuku z vybrané karty službě Google Gemini, zvolte jazyk a stiskněte Start. Volitelný přesný režim používá Groq Whisper k přepisu, Gemini k překladu textu a Gemini 3.1 Flash Live k vytvoření řeči. Vyžaduje klíč Groq, volitelné oprávnění k přístupu k hostiteli a samostatný souhlas se zpracováním zvuku.

Soukromí: zachytávání zvuku začne až po udělení souhlasu a stisknutí tlačítka Start. Zvuk z vybrané karty a přepisy se odesílají přímo poskytovatelům AI potřebným ke zvolenému zpracování, nikdy správci projektu Avorythm. Žádné reklamy, analytika ani zprostředkující server provozovaný vývojářem.

Klíče API se ve výchozím nastavení uchovávají jen po dobu relace. Uložení klíče každého poskytovatele do tohoto zařízení je samostatnou volbou a ve výchozím nastavení je vypnuté. Uložené kopie se nesynchronizují a rozšíření je nešifruje. Vypnutí ukládání odstraní kopii ze zařízení; vymazání klíče odstraní kopii ze zařízení i z relace.

Běžné nahrávání se čtyřmi výstupy je ve výchozím nastavení vypnuté. Synchronizovaný režim nahrává místně pro přehrávání a export a v soukromém úložišti Chrome uchovává pouze poslední záznam. Stažené soubory se ukládají do Downloads/Avorythm.

Avorythm je zdarma a má otevřený zdrojový kód. Bezplatné kvóty a dostupnost modelů externích služeb AI se mohou měnit. Živé zpracování vyžaduje čas na síťovou komunikaci a nezaručuje nulové zpoždění ani dokonalý překlad; důležitý obsah si ověřte. Média chráněná DRM a interní stránky prohlížeče mohou zachytávání znemožnit.

Zdrojový kód: https://github.com/msmahdinejad/avorythm

Uživatelská příručka (anglicky): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Zásady ochrany soukromí: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Co je nového ve verzi 1.1.17

- Snazší výběr jazyka: oblíbené jazyky jsou na začátku a varianty čínštiny a portugalštiny jsou jasně rozlišené.
- Nová projektová dokumentace a materiály v němčině, francouzštině, italštině, ruštině a arabštině.
- Aktualizované obrázky pro obchod vycházející ze skutečného rozhraní produktu.
