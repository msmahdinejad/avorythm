# Chrome Web Store — Turkish (tr)

## Ad

Avorythm — Yapay Zekâ ile Canlı Seslendirme ve Altyazı

## Kısa açıklama

Seçtiğiniz sekme için yapay zekâ çevirisi: canlı seslendirme, iki dilli altyazılar ve senkronize oynatıcı.

## Ayrıntılı açıklama

Kursları, videoları ve filmleri izleyin veya podcast'leri kendi dilinizde dinleyin. Avorythm, açıkça seçtiğiniz tarayıcı sekmesindeki sesi yapay zekâ kullanarak çevirir. Canlı seslendirmeyi dinleyin, kaynak ve çevrilmiş altyazıları görüntüleyin ya da özgün sesi koruyup yalnızca çeviriyi okuyun.

Özgün sayfada düşük gecikmeli oynatmayı veya senkronize kaydedici ve oynatıcıyı seçin. Senkronize yakalama işlemi önceden ilerlerken bağımsız oynatıcı duraklatılabilir, ileri veya geri sarılabilir ve tam ekran kullanılabilir. Kayıt elle sonlandırılabilir.

Dört kanalı bağımsız olarak yönetin: özgün ses, seslendirilmiş ses, kaynak altyazıları ve çevrilmiş altyazılar. Her iki ses düzeyini karıştırın, altyazı katmanını taşıyıp yeniden boyutlandırın ve özelleştirilmiş WebM videoları ile ayrı SRT altyazıları dışa aktarın. İsteğe bağlı normal kayıt, her iki ses kanalını WAV ve her iki altyazı kanalını SRT olarak da kaydeder.

Uzantı; masaüstü uygulaması, Python, FFmpeg, localhost veya sanal ses aygıtı olmadan bağımsız çalışır. Arayüz yalnızca İngilizce, Farsça ve Basitleştirilmiş Çince dillerini destekler; çeviri hedefi ise 79 dil seçeneği arasından bağımsız olarak belirlenir.

Kurulum: Ayarlar bölümünde Google AI Studio'dan kendi Gemini API anahtarınızı girin, seçtiğiniz sekmenin sesinin Google Gemini'ye gönderilmesine açıkça izin verin, bir dil seçin ve Başlat'a basın. İsteğe bağlı hassas mod, konuşmayı metne dönüştürmek için Groq Whisper'ı, metin çevirisi için Gemini'yi ve konuşma için Gemini 3.1 Flash Live'ı kullanır. Bu mod için bir Groq anahtarı, isteğe bağlı ana makine izni ve ayrı bir ses izni gerekir.

Gizlilik: Yakalama yalnızca izin verilip Başlat'a basıldıktan sonra başlar. Seçilen sekmenin sesi ve metin dökümleri, istenen işlemi gerçekleştirmek için gereken yapay zekâ sağlayıcılarına doğrudan gönderilir; Avorythm geliştiricisine hiçbir zaman gönderilmez. Reklam, analiz veya geliştirici tarafından işletilen aktarma sunucusu yoktur.

API anahtarları varsayılan olarak yalnızca oturum boyunca tutulur. Her sağlayıcının anahtarını bu cihazda hatırlamak isteğe bağlıdır ve varsayılan olarak kapalıdır. Saklanan kopyalar senkronize edilmez ve uzantı tarafından şifrelenmez. Hatırlama özelliğini devre dışı bırakmak cihazdaki kopyayı siler; bir anahtarı temizlemek hem cihazdaki hem de oturumdaki kopyaları siler.

Normal dört çıkışlı kayıt varsayılan olarak kapalıdır. Senkronize mod, oynatma ve dışa aktarma için yerel olarak kayıt yapar ve yalnızca en son yakalamayı Chrome'un özel depolama alanında tutar. İndirilen dosyalar Downloads/Avorythm klasörüne kaydedilir.

Avorythm ücretsiz ve açık kaynaklıdır. Harici yapay zekâ hizmetlerinin ücretsiz kotaları ve model kullanılabilirliği değişebilir. Canlı işleme için ağ süresi gerekir ve sıfır gecikme ya da kusursuz çeviri garanti edilmez; önemli içerikleri doğrulayın. DRM korumalı medya ve dahili tarayıcı sayfaları yakalamayı engelleyebilir.

Kaynak: https://github.com/msmahdinejad/avorythm

Kullanım kılavuzu (İngilizce): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Gizlilik politikası: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## 1.1.17 sürümündeki yenilikler

- Daha kolay dil seçimi: popüler diller önce gösterilir, Çince ve Portekizce varyantları açıkça belirtilir.
- Almanca, Fransızca, İtalyanca, Rusça ve Arapça proje belgeleri ile kaynakları eklendi.
- Gerçek ürün arayüzünü temel alan mağaza görselleri yenilendi.
