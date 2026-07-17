# Asystent Głosowy (Android)

Prototyp osobistego asystenta głosowego na Androida. Naciskasz przycisk mikrofonu,
mówisz po polsku, a aplikacja rozpoznaje komendę, wykonuje akcję i odpowiada głosem.

Wszystko działa **na wbudowanych mechanizmach Androida** (rozpoznawanie i synteza mowy Google)
oraz **darmowych API bez kluczy** — nie trzeba niczego rejestrować, żeby uruchomić.

## Co potrafi (komendy głosowe)

| Powiesz np. | Co się dzieje |
|---|---|
| „jaka jest pogoda", „ile stopni" | Pobiera bieżącą pogodę z [Open-Meteo](https://open-meteo.com) dla Twojej lokalizacji |
| „sprawdź sieć", „mam internet?" | Odczytuje typ połączenia (Wi-Fi / komórka) i siłę sygnału |
| „włącz muzykę", „zagraj [wykonawca]" | Uruchamia odtwarzacz (Spotify / YouTube Music / …) |
| „sprawdź pocztę", „otwórz maile" | Otwiera domyślną aplikację poczty |
| „powiedz ciekawostkę", „naucz mnie czegoś" | Podaje ciekawostkę (offline) |
| cokolwiek innego | Wypowiada listę tego, co potrafi |

## Jak uruchomić

1. Zainstaluj **Android Studio** (Ladybug lub nowszy).
2. `File → Open` i wskaż katalog `android-voice-assistant/`.
3. Poczekaj, aż Gradle pobierze zależności (Android Studio sam dograje wrapper Gradle 8.7).
4. Podłącz telefon (z włączonym debugowaniem USB) lub uruchom emulator z Google Play.
5. Kliknij **Run ▶**. Przy pierwszym uruchomieniu zaakceptuj zgody na mikrofon i lokalizację.

> Rozpoznawanie mowy wymaga usług Google — na emulatorze użyj obrazu **z Google Play**,
> a na telefonie miej zainstalowaną aplikację Google / rozpoznawanie mowy.

## Architektura

```
MainActivity ─► VoiceController (STT: SpeechRecognizer, TTS: TextToSpeech)
                     │  rozpoznany tekst
                     ▼
                CommandRouter ─► pierwsza pasująca Action ─► odpowiedź (głos + ekran)
                     │
   MusicAction · NetworkAction · WeatherAction · EmailAction · LearnAction
```

- **`VoiceController`** — obsługuje mikrofon (`SpeechRecognizer`, język `pl-PL`) i głos (`TextToSpeech`, locale `pl`).
- **`CommandRouter`** — dopasowuje tekst do akcji po słowach kluczowych.
- **`Action`** — interfejs jednej umiejętności (`matches` + `run`). Akcje sieciowe zwracają wynik przez callback.

## Jak dodać nową komendę

1. Utwórz klasę w `actions/` implementującą `Action` (wzoruj się na `WeatherAction`).
2. Dopisz jej instancję do listy w `CommandRouter`.

To wszystko — router i UI same ją podłączą.

## Pomysły na rozbudowę

- **Naturalny język zamiast słów kluczowych** — podłączyć model (np. Claude API) z „tool use",
  by sam wybierał akcję i wyłuskiwał parametry.
- **Słowo aktywujące** („Hej asystencie") zamiast przycisku — biblioteka wake-word (Porcupine).
- **Prawdziwy odczyt poczty** — Gmail API + OAuth (zamiast tylko otwierania aplikacji).
- **Widżet / kafelek szybkich ustawień**, żeby odpalać asystenta jednym gestem.

## Ograniczenia prototypu

- Odczyt SSID Wi-Fi i treści maili wymaga dodatkowych uprawnień/API — tu świadomie pominięte.
- Ciekawostki są zapisane na stałe (offline).
- Testowane jako kompletny projekt Gradle; kompilacja wymaga Android SDK (Android Studio).
