# Chrome Web Store — Polish (pl)

## Nazwa

Avorythm — dubbing na żywo i napisy z AI

## Krótki opis

Tłumaczenie AI dźwięku z wybranej karty: dubbing na żywo, dwujęzyczne napisy i zsynchronizowany odtwarzacz.

## Szczegółowy opis

Oglądaj kursy, filmy i materiały wideo lub słuchaj podcastów w swoim języku. Avorythm używa AI do tłumaczenia dźwięku z karty przeglądarki, którą wyraźnie wskażesz. Słuchaj dubbingu na żywo, wyświetlaj napisy w języku oryginału i tłumaczenia albo zachowaj oryginalny dźwięk i czytaj tylko tłumaczenie.

Wybierz odtwarzanie z małym opóźnieniem na oryginalnej stronie albo zsynchronizowaną nagrywarkę i odtwarzacz. W trybie zsynchronizowanym nagrywanie wyprzedza odtwarzanie, a niezależny odtwarzacz pozwala wstrzymać materiał, przewijać go i wyświetlać na pełnym ekranie. Nagrywanie można zakończyć ręcznie.

Steruj niezależnie czterema kanałami: oryginalnym dźwiękiem, dubbingiem, napisami w języku oryginału i przetłumaczonymi napisami. Reguluj głośność obu ścieżek dźwiękowych, przesuwaj i zmieniaj rozmiar nakładki z napisami oraz eksportuj dostosowane wideo WebM i osobne napisy SRT. Opcjonalne zwykłe nagrywanie zapisuje też obie ścieżki dźwiękowe jako pliki WAV i obie ścieżki napisów jako pliki SRT.

Rozszerzenie działa samodzielnie, bez aplikacji komputerowej, Python, FFmpeg, localhost ani wirtualnego urządzenia audio. Interfejs jest obecnie dostępny w języku angielskim, perskim i chińskim uproszczonym; język tłumaczenia wybiera się niezależnie spośród 79 pozycji językowych.

Konfiguracja: wpisz w ustawieniach własny klucz API Gemini z Google AI Studio, wyraź zgodę na przesyłanie dźwięku z wybranej karty do Google Gemini, wybierz język i naciśnij Start. Opcjonalny tryb precyzyjny używa Groq Whisper do transkrypcji, Gemini do tłumaczenia tekstu i Gemini 3.1 Flash Live do generowania mowy. Wymaga klucza Groq, opcjonalnego uprawnienia dostępu do serwera oraz osobnej zgody na przesyłanie dźwięku.

Prywatność: przechwytywanie zaczyna się dopiero po wyrażeniu zgody i naciśnięciu Start. Dźwięk z wybranej karty i transkrypcje trafiają bezpośrednio do dostawców AI potrzebnych do wykonania żądanego przetwarzania, nigdy do twórcy Avorythm. Bez reklam, narzędzi analitycznych i serwera pośredniczącego obsługiwanego przez twórcę.

Domyślnie klucze API są przechowywane tylko przez czas sesji. Zapamiętywanie klucza każdego dostawcy na tym urządzeniu jest osobną, opcjonalną funkcją, domyślnie wyłączoną. Zapisane kopie nie są synchronizowane ani szyfrowane przez rozszerzenie. Wyłączenie zapamiętywania usuwa kopię z urządzenia; usunięcie klucza kasuje zarówno kopię z urządzenia, jak i kopię sesyjną.

Zwykłe nagrywanie czterech plików wyjściowych jest domyślnie wyłączone. Tryb zsynchronizowany nagrywa lokalnie na potrzeby odtwarzania i eksportu oraz przechowuje tylko najnowsze nagranie w prywatnej pamięci Chrome. Pobrane pliki trafiają do Downloads/Avorythm.

Avorythm jest bezpłatne i ma otwarty kod źródłowy. Bezpłatne limity i dostępność modeli zewnętrznych usług AI mogą się zmieniać. Przetwarzanie na żywo wymaga czasu na komunikację sieciową i nie gwarantuje zerowego opóźnienia ani bezbłędnego tłumaczenia; ważne treści należy weryfikować. Materiały chronione przez DRM i wewnętrzne strony przeglądarki mogą uniemożliwiać przechwytywanie.

Kod źródłowy: https://github.com/msmahdinejad/avorythm

Podręcznik użytkownika (po angielsku): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Polityka prywatności: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Co nowego w wersji 1.1.17

- Łatwiejszy wybór języka: popularne języki na początku listy oraz wyraźnie oznaczone odmiany chińskiego i portugalskiego.
- Nowa dokumentacja projektu i materiały w językach niemieckim, francuskim, włoskim, rosyjskim i arabskim.
- Odświeżone grafiki w sklepie oparte na rzeczywistym interfejsie produktu.
