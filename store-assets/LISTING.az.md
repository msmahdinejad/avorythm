# Chrome Web Store — Azerbaijani (az)

## Ad

Avorythm — Süni intellektlə canlı dublyaj və subtitrlər

## Qısa təsvir

Seçdiyiniz vərəqdəki səsin süni intellektlə tərcüməsi: canlı dublyaj, ikidilli subtitrlər və sinxron pleyer.

## Ətraflı təsvir

Kurslara, videolara və filmlərə öz dilinizdə baxın, yaxud podkastları öz dilinizdə dinləyin. Avorythm süni intellektdən istifadə edərək yalnız sizin açıq şəkildə seçdiyiniz brauzer vərəqindəki səsi tərcümə edir. Canlı dublyajı dinləyin, orijinal və tərcümə edilmiş subtitrlərə baxın, yaxud orijinal səsi saxlayıb yalnız tərcüməni oxuyun.

Orijinal səhifədə az gecikməli səsləndirməni və ya sinxronlaşdırılmış yazıcı və pleyeri seçin. Sinxronlaşdırılmış yazma əvvəlcədən irəliləyir, müstəqil pleyerdə isə videonu dayandırmaq, istədiyiniz yerə keçmək və tam ekranda baxmaq mümkündür. Yazmanı əl ilə bitirə bilərsiniz.

Dörd kanalı müstəqil idarə edin: orijinal səs, dublyaj səsi, orijinal subtitrlər və tərcümə edilmiş subtitrlər. Hər iki səsin səviyyəsini tənzimləyin, subtitr örtüyünün yerini və ölçüsünü dəyişin, fərdiləşdirilmiş WebM videosunu və ayrıca SRT subtitrlərini ixrac edin. İstəyə bağlı adi yazma rejimi hər iki səs yolunu WAV, hər iki subtitr yolunu isə SRT formatında saxlayır.

Genişlənmə masaüstü tətbiqi, Python, FFmpeg, localhost və ya virtual səs cihazı olmadan müstəqil işləyir. İnterfeys yalnız ingilis, fars və sadələşdirilmiş Çin dillərini dəstəkləyir; tərcümə dili isə ayrıca olaraq 79 dil seçimindən təyin edilir.

Quraşdırma: Google AI Studio-dan aldığınız şəxsi Gemini API açarını Ayarlara daxil edin, seçilmiş vərəqdəki səsin Google Gemini-yə göndərilməsinə açıq şəkildə razılıq verin, dil seçin və Başlat düyməsini basın. İstəyə bağlı dəqiq rejim transkripsiya üçün Groq Whisper, mətn tərcüməsi üçün Gemini və nitq üçün Gemini 3.1 Flash Live istifadə edir. Bunun üçün Groq açarı, istəyə bağlı host icazəsi və səsin göndərilməsinə ayrıca razılıq tələb olunur.

Məxfilik: səsin tutulması yalnız razılıq verib Başlat düyməsini basdıqdan sonra başlayır. Seçilmiş vərəqdəki səs və transkriptlər tələb olunan emal üçün lazım olan süni intellekt xidməti təminatçılarına birbaşa göndərilir, Avorythm-in tərtibatçısına isə heç vaxt göndərilmir. Reklam, analitika və ya tərtibatçının idarə etdiyi vasitəçi server yoxdur.

API açarları standart olaraq yalnız cari sessiya müddətində saxlanılır. Hər bir xidmət təminatçısının açarını bu cihazda yadda saxlamaq ayrıca seçilə bilər və standart olaraq söndürülüb. Cihazda saxlanan nüsxələr sinxronlaşdırılmır və genişlənmə tərəfindən şifrələnmir. Yadda saxlamağı söndürmək cihazdakı nüsxəni, açarı silmək isə həm cihazdakı, həm də sessiyadakı nüsxələri silir.

Dörd çıxış faylı yaradan adi yazma rejimi standart olaraq söndürülüb. Sinxronlaşdırılmış rejim oxutma və ixrac üçün yazını yerli olaraq saxlayır və Chrome-un özəl yaddaşında yalnız ən son yazını saxlayır. Endirilən fayllar Downloads/Avorythm qovluğuna yerləşdirilir.

Avorythm pulsuz və açıq mənbəlidir. Xarici süni intellekt xidmətlərinin pulsuz istifadə limitləri və modellərinin əlçatanlığı dəyişə bilər. Canlı emal şəbəkə üzərindən vaxt tələb edir və sıfır gecikməyə və ya qüsursuz tərcüməyə zəmanət vermir; vacib məzmunu yoxlayın. DRM ilə qorunan media və brauzerin daxili səhifələri səsin tutulmasına mane ola bilər.

Mənbə kodu: https://github.com/msmahdinejad/avorythm

İstifadəçi təlimatı (ingiliscə): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Məxfilik siyasəti: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## 1.1.16 versiyasında yeniliklər

- Dil seçimi asanlaşdırılıb: populyar dillər əvvəldə göstərilir, Çin və Portuqal dili variantları isə aydın şəkildə fərqləndirilir.
- Alman, fransız, italyan, rus və ərəb dillərində yeni layihə sənədləri və resurslar əlavə edilib.
- Mağaza şəkilləri məhsulun real interfeysi əsasında yenilənib.
