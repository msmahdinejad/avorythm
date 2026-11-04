# Chrome Web Store — Javanese (jv)

## Jeneng

Avorythm — Sulih Swara Langsung lan Subtitel nganggo AI

## Katrangan cekak

Terjemahan AI kanggo tab sing dipilih: sulih swara langsung, subtitel dwibasa, lan pamuter sing diselarasake.

## Katrangan rinci

Tonton kursus, video, lan film, utawa rungokna podcast nganggo basa sing panjenengan pilih. Avorythm nggunakake AI kanggo nerjemahake audio saka tab browser sing panjenengan pilih kanthi cetha. Panjenengan bisa ngrungokake sulih swara langsung, ndeleng subtitel basa asli lan terjemahane, utawa tetep ngrungokake audio asli lan mung maca terjemahane.

Pilih puter maneh kanthi wektu tundha sing sithik ing kaca asli, utawa gunakake perekam lan pamuter sing diselarasake. Nalika ngrekam kanthi mode iki, proses njupuk rekaman lumaku luwih dhisik, dene pamuter sing kapisah bisa dijeda, digeser menyang wektu tartamtu, lan ditampilake layar wutuh. Rekaman bisa dirampungake kanthi manual.

Atur patang saluran kanthi kapisah: audio asli, audio sulih swara, subtitel basa asli, lan subtitel terjemahan. Campur tingkat swara saka loro audio, pindhah lan owahi ukuran lapisan subtitel, banjur ekspor video WebM sing wis disesuaikake lan subtitel SRT sing kapisah. Yen diaktifake, rekaman biasa uga nyimpen loro trek audio minangka WAV lan loro trek subtitel minangka SRT.

Ekstensi iki bisa digunakake kanthi mandhiri, tanpa aplikasi desktop, Python, FFmpeg, localhost, utawa piranti audio virtual. Antarmuka sing kasedhiya saiki nganggo basa Inggris, Persia, lan Tionghoa Sederhana; basa tujuan terjemahan dipilih kanthi kapisah saka 79 pilihan basa.

Persiyapan: lebokna kunci API Gemini duweke panjenengan saka Google AI Studio ing Setelan, wenehana idin kanthi cetha kanggo ngirim audio saka tab sing dipilih menyang Google Gemini, pilih basa, banjur pencet Start. Mode presisi opsional nggunakake Groq Whisper kanggo transkripsi, Gemini kanggo nerjemahake teks, lan Gemini 3.8 Flash TTS kanggo swara. Mode iki mbutuhake kunci Groq, idin akses host sing opsional, lan idin audio sing kapisah.

Privasi: njupuk audio mung diwiwiti sawise panjenengan menehi idin lan mencet Start. Audio lan transkrip saka tab sing dipilih dikirim langsung menyang panyedhiya AI sing dibutuhake kanggo pangolahan sing dijaluk, ora tau menyang pangurus Avorythm. Ora ana iklan, analitik, utawa server perantara sing dioperasikake pangembang.

Kanthi setelan gawan, kunci API mung disimpen sajrone sesi. Pilihan kanggo ngelingi kunci saben panyedhiya ing piranti iki bisa diaktifake kanthi kapisah lan, kanthi setelan gawan, ora aktif. Salinan sing disimpen ora disinkronake lan ora dienkripsi dening ekstensi. Mateni pilihan kanggo ngelingi kunci bakal mbusak salinane ing piranti; mbusak kunci bakal mbusak salinan ing piranti lan ing sesi.

Kanthi setelan gawan, rekaman biasa kanthi patang asil ora aktif. Mode sing diselarasake ngrekam kanthi lokal kanggo puter maneh lan ekspor, lan mung nyimpen rekaman paling anyar ing panyimpenan pribadi Chrome. Berkas sing diundhuh disimpen ing Downloads/Avorythm.

Avorythm gratis lan sumber terbuka. Kuota gratis lan kasedhiyan model saka layanan AI njaba bisa owah. Pangolahan langsung mbutuhake wektu jaringan lan ora njamin tanpa wektu tundha utawa terjemahan sing sampurna; priksa maneh isi sing penting. Media sing dilindhungi DRM lan kaca internal browser bisa ngalangi pangambilan audio.

Kode sumber: https://github.com/msmahdinejad/avorythm

Pandhuan pangguna (basa Inggris): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Kabijakan privasi: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Apa sing anyar ing 1.1.20

- Dubbing no longer depends on Gemini 3.1 Flash Live, which Google shuts down on 17 November 2026. Precise mode and file dubbing now use Gemini 3.8, and you can pick the voice model in Settings: Flash TTS (default), Live (the most natural voice) or Flash-Lite (fastest).
- A clear message replaces the cryptic error when an API key contains characters that are not allowed, such as a dot copied from a masked field.
