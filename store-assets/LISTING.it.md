# Presentazione Chrome Web Store — Italiano

## Nome

Avorythm — Doppiaggio IA e sottotitoli live

## Descrizione breve

Traduci l’audio di una scheda con l’IA: doppiaggio live, sottotitoli bilingui, mix audio indipendente e lettore sincronizzato.

## Descrizione completa

Guarda corsi, video e film o ascolta podcast nella tua lingua. Avorythm usa l’IA per tradurre l’audio della scheda che scegli tu. Ascolta il doppiaggio in tempo reale, visualizza i sottotitoli originali e tradotti oppure mantieni l’audio originale e leggi soltanto la traduzione.

L’estensione offre 79 lingue di destinazione, tra cui italiano, inglese, persiano, arabo, cinese semplificato e tradizionale, tedesco, francese, spagnolo, russo, giapponese, coreano, turco, portoghese, hindi, urdu e molte altre.

Scegli come guardare:

- In questa pagina: il percorso a bassa latenza per audio e sottotitoli live.
- Registratore e lettore sincronizzati: la registrazione procede in anticipo rispetto alla visione. Nel lettore indipendente puoi mettere in pausa, andare avanti e indietro e attivare lo schermo intero. Puoi terminare manualmente la registrazione quando vuoi.

Audio originale, doppiaggio, sottotitoli originali e sottotitoli tradotti sono quattro canali indipendenti. Combinali liberamente, regola entrambi i volumi e sposta o ridimensiona il riquadro dei sottotitoli. Esporta il video registrato in WebM con il mix audio scelto e file SRT separati. La registrazione normale facoltativa permette anche di salvare le due tracce audio in formato WAV e le due tracce di sottotitoli in formato SRT.

L’estensione funziona da sola: non richiede app desktop, Python, FFmpeg, localhost o dispositivi audio virtuali. L’interfaccia attuale è disponibile in inglese, persiano e cinese semplificato. La lingua della traduzione si sceglie separatamente.

Per iniziare, inserisci la tua chiave API Gemini di Google AI Studio nelle impostazioni, autorizza esplicitamente l’invio dell’audio della scheda selezionata a Google Gemini, scegli una lingua e premi Avvia. Il percorso preciso facoltativo usa Groq Whisper per la trascrizione, Gemini per la traduzione del testo e Gemini 3.1 Flash Live per generare la voce. Richiede una chiave Groq, un permesso facoltativo per i siti (autorizzazione host) e un consenso separato per il trattamento dell’audio.

Privacy: l’acquisizione inizia solo dopo il tuo consenso e la pressione di Avvia. L’audio e le trascrizioni della scheda scelta vengono inviati direttamente ai servizi IA necessari, mai allo sviluppatore di Avorythm. Non ci sono pubblicità, strumenti di analisi o server intermediari gestiti dallo sviluppatore. Per impostazione predefinita, le chiavi restano soltanto nella sessione del browser. Puoi scegliere di ricordare separatamente ogni chiave su questo dispositivo. Le copie salvate non vengono sincronizzate né cifrate dall’estensione. Disattivare l’opzione elimina la copia locale; cancellare una chiave elimina sia la copia locale sia quella della sessione.

La registrazione normale dei quattro file è disattivata per impostazione predefinita. La modalità sincronizzata registra localmente per la riproduzione e l’esportazione e conserva soltanto l’ultima registrazione nello spazio privato di Chrome. I file scaricati vengono salvati in Downloads/Avorythm.

Avorythm è gratuito e open source. Le quote gratuite e i modelli disponibili dei fornitori esterni possono cambiare. L’elaborazione live richiede tempo di rete e non garantisce ritardo zero o traduzioni perfette. Verifica i contenuti importanti. I contenuti protetti da DRM e le pagine interne del browser possono impedire l’acquisizione.

Codice sorgente: https://github.com/msmahdinejad/avorythm

Guida: https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.it.md

Informativa sulla privacy: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Novità della versione 1.1.16

- Selezione della lingua più semplice, con le lingue comuni in cima e varianti cinesi e portoghesi ben distinte.
- Documentazione e risorse del progetto in tedesco, francese, italiano, russo e arabo.
- Nuove immagini dello Store basate sull’interfaccia reale del prodotto.
