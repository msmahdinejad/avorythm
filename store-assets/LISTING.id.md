# Chrome Web Store — Indonesian (id)

## Nama

Avorythm — Sulih Suara Langsung & Teks Terjemahan dengan AI

## Deskripsi singkat

Terjemahan AI untuk tab yang dipilih: sulih suara langsung, teks dwibahasa, dan pemutar tersinkronisasi.

## Deskripsi lengkap

Tonton kursus, video, dan film atau dengarkan podcast dalam bahasa Anda. Avorythm menggunakan AI untuk menerjemahkan audio dari tab browser yang Anda pilih secara eksplisit. Dengarkan ucapan yang dialihsuarakan secara langsung, lihat teks sumber dan terjemahan, atau pertahankan audio asli dan baca terjemahannya saja.

Pilih pemutaran latensi rendah di halaman asli atau perekam dan pemutar tersinkronisasi. Perekaman tersinkronisasi berjalan mendahului pemutaran, sementara pemutar independen dapat dijeda, dipindahkan posisinya, dan ditampilkan dalam layar penuh. Perekaman dapat diakhiri secara manual.

Kendalikan empat saluran secara terpisah: audio asli, audio sulih suara, subtitle sumber, dan subtitle terjemahan. Atur tingkat kedua audio, pindahkan dan ubah ukuran hamparan teks, serta ekspor video WebM yang disesuaikan dan subtitle SRT terpisah. Perekaman biasa opsional juga menyimpan kedua trek audio sebagai WAV dan kedua trek subtitle sebagai SRT.

Ekstensi ini bekerja secara mandiri tanpa aplikasi desktop, Python, FFmpeg, localhost, atau perangkat audio virtual. Antarmukanya mendukung English, Persian, dan Simplified Chinese; bahasa terjemahan dipilih secara terpisah dari 79 pilihan bahasa.

Penyiapan: masukkan kunci API Gemini Anda sendiri dari Google AI Studio di Setelan, berikan persetujuan secara eksplisit untuk mengirim audio dari tab yang dipilih ke Google Gemini, pilih bahasa, lalu tekan Mulai. Mode presisi opsional menggunakan Groq Whisper untuk transkripsi, Gemini untuk terjemahan teks, dan Gemini 3.1 Flash Live untuk ucapan. Mode ini memerlukan kunci Groq, izin host opsional, dan persetujuan audio terpisah.

Privasi: perekaman hanya dimulai setelah persetujuan dan tombol Mulai diberikan. Audio dan transkrip dari tab yang dipilih dikirim langsung ke penyedia AI yang diperlukan untuk pemrosesan yang diminta, bukan kepada pengelola Avorythm. Tidak ada iklan, analitik, atau server relai yang dioperasikan pengembang.

Secara default, kunci API hanya berlaku selama sesi. Menyimpan kunci masing-masing penyedia di perangkat ini bersifat opsional dan secara default dinonaktifkan. Salinan yang disimpan tidak disinkronkan dan tidak dienkripsi oleh ekstensi. Menonaktifkan penyimpanan akan menghapus salinan di perangkat; menghapus kunci akan menghapus salinan di perangkat dan selama sesi.

Perekaman empat keluaran biasa secara default dinonaktifkan. Mode tersinkronisasi merekam secara lokal untuk pemutaran dan ekspor, serta hanya menyimpan hasil perekaman terbaru di penyimpanan privat Chrome. File yang diunduh disimpan di Downloads/Avorythm.

Avorythm gratis dan bersumber terbuka. Kuota gratis dan ketersediaan model dari layanan AI eksternal dapat berubah. Pemrosesan langsung memerlukan waktu jaringan dan tidak menjamin latensi nol atau terjemahan yang sempurna; periksa kembali konten penting. Media yang dilindungi DRM dan halaman internal browser mungkin mencegah perekaman.

Sumber: https://github.com/msmahdinejad/avorythm

Panduan pengguna (English): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Kebijakan privasi: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Yang baru di 1.1.16

- Pemilihan bahasa yang lebih mudah: bahasa populer ditampilkan lebih dulu, dengan varian bahasa Tionghoa dan Portugis yang jelas.
- Dokumentasi dan sumber daya proyek baru dalam bahasa Jerman, Prancis, Italia, Rusia, dan Arab.
- Gambar-gambar listing diperbarui berdasarkan antarmuka produk yang sebenarnya.
