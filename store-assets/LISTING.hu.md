# Chrome Web Store — Hungarian (hu)

## Név

Avorythm — MI-alapú élő szinkron és feliratok

## Rövid leírás

MI-alapú fordítás a kiválasztott lapon: élő szinkron, kétnyelvű feliratok és szinkronizált lejátszó.

## Részletes leírás

Nézzen tanfolyamokat, videókat és filmeket, vagy hallgasson podcastokat a saját nyelvén. Az Avorythm mesterséges intelligenciával fordítja le a kifejezetten kiválasztott böngészőlap hangját. Hallgassa élőben a szinkronizált beszédet, kövesse az eredeti és a lefordított feliratokat, vagy tartsa meg az eredeti hangot, és csak a fordítást olvassa.

Válasszon az eredeti oldalon működő, alacsony késleltetésű lejátszás, illetve a szinkronizált rögzítő és lejátszó között. Szinkronizált módban a rögzítés a lejátszás előtt jár, a különálló lejátszóval pedig szüneteltetheti a lejátszást, a felvétel más pontjára ugorhat, és teljes képernyőre válthat. A rögzítést kézzel is befejezheti.

Négy csatornát szabályozhat egymástól függetlenül: az eredeti hangot, a szinkronizált hangot, az eredeti feliratokat és a lefordított feliratokat. Beállíthatja a két hangsáv hangerejét, áthelyezheti és átméretezheti a feliratokat megjelenítő réteget, valamint egyéni beállításokkal exportálhat WebM-videót és külön SRT-feliratokat. Az opcionális hagyományos rögzítés mindkét hangsávot WAV-, mindkét feliratsávot pedig SRT-fájlként is menti.

A bővítmény önállóan működik: nincs szüksége asztali alkalmazásra, Pythonra, FFmpegre, localhostra vagy virtuális hangeszközre. A jelenlegi kezelőfelület angol, perzsa és egyszerűsített kínai nyelvű; a fordítás célnyelvét ettől függetlenül, 79 nyelvi lehetőség közül választhatja ki.

Beállítás: adja meg a Google AI Studióban beszerzett saját Gemini API-kulcsát a Beállításokban, kifejezetten járuljon hozzá a kiválasztott lap hangjának a Google Gemini részére történő továbbításához, válasszon nyelvet, majd nyomja meg az Indítás gombot. Az opcionális precíz mód a Groq Whisper szolgáltatást használja az átíráshoz, a Geminit a szöveg fordításához, a Gemini 3.1 Flash Live szolgáltatást pedig a beszédhez. Ehhez Groq-kulcs, opcionális gazdagépi engedély és külön hozzájárulás szükséges a hang továbbításához.

Adatvédelem: a hangrögzítés csak a hozzájárulás megadása és az Indítás gomb megnyomása után kezdődik. A kiválasztott lap hangja és az átiratok közvetlenül a kért feldolgozáshoz szükséges MI-szolgáltatókhoz kerülnek, az Avorythm fejlesztőjéhez soha. Nincsenek hirdetések, analitika vagy a fejlesztő által üzemeltetett közvetítőszerver.

Az API-kulcsok alapértelmezés szerint csak a munkamenet idejére maradnak meg. Az egyes szolgáltatók kulcsainak megjegyzése ezen az eszközön külön-külön választható, és alapértelmezés szerint ki van kapcsolva. Az eszközön tárolt példányok nem szinkronizálódnak, és a bővítmény nem titkosítja őket. A megjegyzés kikapcsolása törli az eszközön tárolt példányt; a kulcs törlése az eszközön és a munkamenetben tárolt példányt is törli.

A hagyományos, négy kimenetet mentő rögzítés alapértelmezés szerint ki van kapcsolva. A szinkronizált mód helyben rögzít a lejátszáshoz és az exportáláshoz, és a Chrome privát tárhelyén csak a legutóbbi felvételt tartja meg. A letöltött fájlok a Downloads/Avorythm mappába kerülnek.

Az Avorythm ingyenes és nyílt forráskódú. A külső MI-szolgáltatások ingyenes használati keretei és modelljeinek elérhetősége változhat. Az élő feldolgozás hálózati időt igényel, és nem garantál sem nulla késleltetést, sem tökéletes fordítást; a fontos tartalmakat ellenőrizze. A DRM-védelemmel ellátott média és a böngésző belső oldalai megakadályozhatják a rögzítést.

Forráskód: https://github.com/msmahdinejad/avorythm

Felhasználói útmutató (angolul): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Adatvédelmi szabályzat: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Újdonságok az 1.1.16-ös verzióban

- Egyszerűbb nyelvválasztás: a népszerű nyelvek kerültek előre, a kínai és a portugál változatok egyértelmű megjelölésével.
- Új német, francia, olasz, orosz és arab nyelvű projektdokumentáció és segédanyagok.
- Frissített áruházi képek a termék valódi kezelőfelülete alapján.
