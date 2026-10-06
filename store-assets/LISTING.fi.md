# Chrome Web Store — Finnish (fi)

## Nimi

Avorythm — tekoälypohjainen reaaliaikainen dubbaus ja tekstitys

## Lyhyt kuvaus

Tekoälykäännös valitulle välilehdelle: reaaliaikainen dubbaus, kaksikieliset tekstitykset ja synkronoitu soitin.

## Yksityiskohtainen kuvaus

Katso kursseja, videoita ja elokuvia tai kuuntele podcasteja omalla kielelläsi. Avorythm käyttää tekoälyä kääntääkseen erikseen valitsemasi selainvälilehden äänen. Kuuntele reaaliajassa dubattua puhetta, seuraa alkuperäis- ja käännöstekstityksiä tai säilytä alkuperäinen ääni ja lue vain käännöstä.

Valitse vähäviiveinen toisto alkuperäisellä sivulla tai synkronoitu tallennin ja soitin. Synkronoitu tallennus etenee toiston edellä, ja erillisessä soittimessa voit keskeyttää toiston, siirtyä toiseen kohtaan ja käyttää koko näytön tilaa. Tallennuksen voi päättää manuaalisesti.

Hallitse neljää kanavaa erikseen: alkuperäistä ääntä, dubattua ääntä, alkuperäiskielisiä tekstityksiä ja käännöstekstityksiä. Säädä molempien ääniraitojen voimakkuutta, siirrä tekstityspeittokuvaa ja muuta sen kokoa sekä vie mukautettu WebM-video ja erilliset SRT-tekstitykset. Valinnainen tavallinen tallennus tallentaa lisäksi molemmat ääniraidat WAV-muodossa ja molemmat tekstitysraidat SRT-muodossa.

Laajennus toimii itsenäisesti ilman työpöytäsovellusta, Pythonia, FFmpeg:iä, localhostia tai virtuaalista äänilaitetta. Nykyinen käyttöliittymä tukee vain englantia, persiaa ja yksinkertaistettua kiinaa. Käännöksen kohdekieli valitaan erikseen 79 kielivaihtoehdosta.

Käyttöönotto: lisää Asetuksiin oma Google AI Studiosta hankkimasi Gemini-API-avain, anna nimenomainen suostumus valitun välilehden äänen lähettämiseen Google Gemini -palveluun, valitse kieli ja paina Start. Valinnainen tarkka tila käyttää litterointiin Groq Whisperiä, tekstin kääntämiseen Geminiä ja puheen tuottamiseen Gemini 3.1 Flash Liveä. Se vaatii Groq-avaimen, valinnaisen sivuston käyttöoikeuden ja erillisen suostumuksen äänen lähettämiseen.

Tietosuoja: äänen kaappaus alkaa vasta suostumuksen antamisen ja Start-painikkeen painamisen jälkeen. Valitun välilehden ääni ja litteroinnit lähetetään suoraan pyydettyyn käsittelyyn tarvittaville tekoälypalveluntarjoajille, ei koskaan Avorythmin ylläpitäjälle. Ei mainoksia, analytiikkaa eikä kehittäjän ylläpitämää välityspalvelinta.

API-avaimet säilyvät oletusarvoisesti vain istunnon ajan. Kunkin palveluntarjoajan avaimen muistaminen tällä laitteella on erikseen valittavissa ja oletusarvoisesti pois käytöstä. Tallennettuja kopioita ei synkronoida, eikä laajennus salaa niitä. Muistamisen poistaminen käytöstä poistaa laitteelle tallennetun kopion; avaimen tyhjentäminen poistaa sekä laite- että istuntokopion.

Tavallinen neljän tulosteen tallennus on oletusarvoisesti pois käytöstä. Synkronoitu tila tallentaa paikallisesti toistoa ja vientiä varten ja säilyttää Chromen yksityisessä tallennustilassa vain uusimman tallenteen. Ladatut tiedostot tallennetaan kansioon Downloads/Avorythm.

Avorythm on ilmainen ja avoimen lähdekoodin sovellus. Ulkoisten tekoälypalvelujen ilmaiskiintiöt ja mallien saatavuus voivat muuttua. Reaaliaikainen käsittely vaatii verkkoyhteyden välityksellä tapahtuvaan tiedonsiirtoon aikaa eikä takaa viiveettömyyttä tai virheetöntä käännöstä. Tarkista tärkeä sisältö. DRM-suojattu media ja selaimen sisäiset sivut voivat estää äänen kaappauksen.

Lähdekoodi: https://github.com/msmahdinejad/avorythm

Käyttöopas (englanniksi): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Tietosuojakäytäntö: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Uutta versiossa 1.1.16

- Kielen valinta on helpompaa: suositut kielet ovat ensin, ja kiinan sekä portugalin kielimuodot on eroteltu selkeästi.
- Uutta saksan-, ranskan-, italian-, venäjän- ja arabiankielistä projektidokumentaatiota ja aineistoa.
- Kaupan kuvat on päivitetty vastaamaan tuotteen todellista käyttöliittymää.
