# Chrome Web Store — Filipino (fil)

## Pangalan

Avorythm — Live Dubbing at mga Subtitle gamit ang AI

## Maikling paglalarawan

Pagsasalin gamit ang AI para sa napili mong tab: live dubbing, mga caption sa dalawang wika, at naka-synchronize na player.

## Detalyadong paglalarawan

Manood ng mga kurso, video at pelikula, o makinig sa mga podcast sa sarili mong wika. Gumagamit ang Avorythm ng AI para isalin ang audio mula sa browser tab na tahasan mong pinili. Pakinggan ang live na dubbing, tingnan ang mga caption sa orihinal at isinaling wika, o panatilihin ang orihinal na audio at basahin lamang ang salin.

Pumili sa pagitan ng playback na may mababang latency sa orihinal na pahina at ng naka-synchronize na recorder at player. Nauuna ang naka-synchronize na pag-record habang maaaring i-pause, hanapan ng partikular na bahagi, at gawing fullscreen ang hiwalay na player. Maaari mo ring manu-manong tapusin ang pag-record.

Kontrolin nang hiwalay ang apat na channel: orihinal na audio, naka-dub na audio, mga subtitle sa orihinal na wika, at mga isinaling subtitle. Ayusin ang lakas ng parehong audio, ilipat at baguhin ang laki ng nakapatong na mga caption, at mag-export ng WebM video na may sarili mong mga setting at magkakahiwalay na SRT subtitle. Maaari ring i-save ng opsyonal na karaniwang pag-record ang parehong audio track bilang WAV at ang parehong subtitle track bilang SRT.

Gumagana nang mag-isa ang extension, nang hindi kailangan ang desktop app, Python, FFmpeg, localhost o virtual audio device. English, Persian at Simplified Chinese lamang ang sinusuportahan ng kasalukuyang interface; hiwalay na pinipili ang wikang pagsasalinan mula sa 79 na pagpipilian ng wika.

Pag-setup: ilagay sa Settings ang sarili mong Gemini API key mula sa Google AI Studio, tahasang pumayag na ipadala sa Google Gemini ang audio ng napili mong tab, pumili ng wika, at pindutin ang Start. Ginagamit ng opsyonal na precise mode ang Groq Whisper para sa transkripsyon, Gemini para sa pagsasalin ng teksto, at Gemini 3.1 Flash Live para sa pagsasalita. Kailangan nito ng Groq key, opsyonal na pahintulot sa host, at hiwalay na pahintulot para sa audio.

Privacy: magsisimula lamang ang pagkuha ng audio pagkatapos mong magbigay ng pahintulot at pindutin ang Start. Direktang ipinapadala ang audio at mga transcript mula sa napili mong tab sa mga AI provider na kailangan para sa hiniling na pagproseso, at hindi kailanman sa tagapamahala ng Avorythm. Walang mga ad, analytics o relay server na pinapatakbo ng developer.

Para lamang sa kasalukuyang session ang mga API key bilang default. Opsyonal at naka-off bilang default ang hiwalay na pag-alala sa key ng bawat provider sa device na ito. Ang mga nakaimbak na kopya ay hindi sini-sync at hindi ini-encrypt ng extension. Buburahin ang kopya sa device kapag in-off ang pag-alala; buburahin naman ang mga kopya sa device at session kapag ni-clear ang isang key.

Naka-off bilang default ang karaniwang pag-record ng apat na output. Lokal na nagre-record ang naka-synchronize na mode para sa playback at pag-export, at ang pinakabagong recording lamang ang pinananatili nito sa pribadong storage ng Chrome. Napupunta ang mga na-download na file sa Downloads/Avorythm.

Libre at open source ang Avorythm. Maaaring magbago ang mga libreng quota at ang availability ng mga modelo ng mga panlabas na serbisyo ng AI. Nangangailangan ng oras sa network ang live na pagproseso at hindi ginagarantiya ang zero latency o perpektong pagsasalin; tiyaking tama ang mahahalagang nilalaman. Maaaring pigilan ng media na protektado ng DRM at ng mga panloob na pahina ng browser ang pagkuha ng audio.

Source code: https://github.com/msmahdinejad/avorythm

Gabay sa paggamit (English): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Patakaran sa privacy: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Ano ang bago sa 1.1.17

- Mas madaling pumili ng wika: nauuna ang mga sikat na wika, at malinaw ang mga variant ng Chinese at Portuguese.
- Bagong dokumentasyon at mga resource ng proyekto sa German, French, Italian, Russian at Arabic.
- Mga na-update na larawan sa store na batay sa aktuwal na interface ng produkto.
