# Guida di Avorythm

[English](HELP.md) · [فارسی](HELP.fa.md) · [简体中文](HELP.zh-CN.md) · [Privacy](../PRIVACY.md)

Avorythm è composto da due prodotti indipendenti: l’app desktop per programmi e file locali e l’estensione Chrome/Edge che traduce solo la scheda scelta esplicitamente. L’estensione non richiede app desktop, Python, FFmpeg o localhost.

## Lingue e privacy

Sono disponibili inglese, persiano, arabo, cinese semplificato/tradizionale, tedesco, francese, italiano, spagnolo, russo, giapponese, coreano, turco, portoghese, olandese, polacco, ucraino, hindi, urdu, ebraico, indonesiano, malese, vietnamita, tailandese e altre lingue. Le chiavi Google e Groq restano nella sessione del browser per impostazione predefinita; la registrazione è disattivata. Avorythm non invia contenuti al manutentore e non usa pubblicità o analytics.

## App desktop

1. Scarica il pacchetto dal [pagina Releases](https://github.com/msmahdinejad/avorythm/releases). L’installer Windows include FFmpeg.
2. Apri Advanced settings, inserisci una chiave Gemini e salvala. Per i file aggiungi anche una chiave Groq Whisper.
3. Per tradurre VLC o un’altra app in diretta, instrada l’uscita dell’app verso un dispositivo loopback/monitor e sceglilo come ingresso Avorythm. I file caricati non richiedono dispositivi virtuali.
4. In File Studio scegli lingua, voce e **Precise sync** o **Fast**. Al termine scarica `original.wav`, `dubbed.wav`, `source.srt` e `translated.srt`.

I quattro canali sono indipendenti: puoi combinare audio originale, doppiaggio, sottotitoli sorgente e tradotti, regolare i volumi e aprire la finestra dei sottotitoli mobile e ridimensionabile.

## Estensione

Installa [Avorythm dal Chrome Web Store](https://chromewebstore.google.com/detail/avorythm-live-translation/kbdbbedijheicmmmoidamdaodjbhjje), oppure abilita Developer mode in `chrome://extensions` e scegli Load unpacked dopo aver estratto lo ZIP.

Al primo avvio apri Settings, inserisci la chiave Gemini e conferma esplicitamente l’invio dell’audio della scheda selezionata a Google Gemini. Scegli una lingua e una modalità:

- **On this page**: percorso live con la latenza più bassa.
- **Synchronized recorder & player**: registra in anticipo per consentire seek, pausa, fullscreen ed export.

L’audio originale, il doppiaggio, i sottotitoli originali e quelli tradotti possono essere attivati separatamente. La registrazione parte solo dopo l’attivazione e Start.

Per assistenza consulta la [guida inglese completa](HELP.md) o apri una [Issue](https://github.com/msmahdinejad/avorythm/issues) con passi di riproduzione e log.
