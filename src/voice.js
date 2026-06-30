// Sterowanie głosem (Web Speech API) — komendy + dyktowanie po polsku.
// Wspierane głównie w przeglądarce Chrome (pl-PL).

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

export function obslugiwane() {
  return !!SR;
}

// Słowniki liczebników -> cyfra
const LICZBY = {
  'jeden': 1, 'jedynka': 1, 'pierwszy': 1, '1': 1,
  'dwa': 2, 'dwójka': 2, 'drugi': 2, '2': 2,
  'trzy': 3, 'trójka': 3, 'trzeci': 3, '3': 3,
  'cztery': 4, 'czwórka': 4, 'czwarty': 4, '4': 4,
};

const OCENY = {
  'dobry': 'Dobry', 'dobra': 'Dobry',
  'zadowalający': 'Zadowalający', 'zadowalająca': 'Zadowalający', 'zadowalajacy': 'Zadowalający',
  'dostateczny': 'Dostateczny', 'dostateczna': 'Dostateczny',
  'zły': 'Zły', 'zła': 'Zły', 'zly': 'Zły',
  'awaryjny': 'Awaryjny', 'awaryjna': 'Awaryjny',
};

// Definicje komend: regex -> nazwa akcji + ekstrakcja argumentu.
// Kolejność ma znaczenie (pierwsze dopasowanie wygrywa).
const KOMENDY = [
  { re: /^(nowa sekcja|dodaj sekcj[ęe]|nowy obszar)\b\s*(.*)$/, cmd: 'nowaSekcja', arg: (m) => m[2].trim() },
  { re: /^(nowe ustalenie|nowa usterka|dodaj usterk[ęe]|dodaj ustalenie)\b\s*(.*)$/, cmd: 'noweUstalenie', arg: (m) => m[2].trim() },
  { re: /^(stopie[ńn] pilno[śs]ci|pilno[śs][ćc])\s+(.+)$/, cmd: 'pilnosc', arg: (m) => LICZBY[m[2].trim()] || null },
  { re: /^(ocena|stan)\s+(.+)$/, cmd: 'ocena', arg: (m) => OCENY[m[2].trim()] || null },
  { re: /^(wstaw zdj[ęe]cie|dodaj zdj[ęe]cie|zr[óo]b zdj[ęe]cie|aparat)\b/, cmd: 'zdjecie' },
  { re: /^(podpis|opis zdj[ęe]cia)\b\s*(.*)$/, cmd: 'podpisZdjecia', arg: (m) => m[2].trim() },
  { re: /^(dyktuj|dyktowanie)\b/, cmd: 'dyktuj' },
  { re: /^(koniec|stop dyktowanie|koniec dyktowania|przesta[ńn])\b/, cmd: 'koniecDyktowania' },
  { re: /^(nowy akapit|enter)\b/, cmd: 'nowyAkapit' },
  { re: /^(wyczy[śs][ćc] pole|skasuj pole)\b/, cmd: 'wyczyscPole' },
  { re: /^(zapisz)\b/, cmd: 'zapisz' },
  { re: /^(eksportuj|generuj protok[óo][łl]|generuj word|pobierz protok[óo][łl])\b/, cmd: 'eksport' },
];

export class VoiceController {
  // handlers: { onStatus(stan), onLog(tekst), onCommand(cmd, arg), onDictation(tekst) }
  constructor(handlers = {}) {
    this.h = handlers;
    this.rec = null;
    this.wlaczony = false;
    this.dyktowanie = false;
  }

  ustawDyktowanie(v) {
    this.dyktowanie = v;
    this.h.onStatus && this.h.onStatus(this.stan());
  }

  stan() {
    return { wlaczony: this.wlaczony, dyktowanie: this.dyktowanie };
  }

  przelacz() {
    if (this.wlaczony) this.stop(); else this.start();
  }

  start() {
    if (!SR) { this.h.onLog && this.h.onLog('Rozpoznawanie mowy nie jest wspierane w tej przeglądarce. Użyj Chrome.'); return; }
    if (this.wlaczony) return;
    const rec = new SR();
    rec.lang = 'pl-PL';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (ev) => this._onResult(ev);
    rec.onerror = (ev) => {
      if (ev.error === 'no-speech' || ev.error === 'aborted') return;
      this.h.onLog && this.h.onLog('Błąd mikrofonu: ' + ev.error);
    };
    rec.onend = () => {
      // Chrome kończy sesję samoczynnie — wznawiamy, jeśli nadal włączone
      if (this.wlaczony) {
        try { rec.start(); } catch (e) { /* już startuje */ }
      }
    };

    this.rec = rec;
    this.wlaczony = true;
    try { rec.start(); } catch (e) { /* ignore */ }
    this.h.onStatus && this.h.onStatus(this.stan());
    this.h.onLog && this.h.onLog('Mikrofon włączony — mów komendy lub dyktuj.');
  }

  stop() {
    this.wlaczony = false;
    this.dyktowanie = false;
    if (this.rec) { try { this.rec.stop(); } catch (e) {} this.rec = null; }
    this.h.onStatus && this.h.onStatus(this.stan());
    this.h.onLog && this.h.onLog('Mikrofon wyłączony.');
  }

  _onResult(ev) {
    let finalny = '';
    let tymczasowy = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const r = ev.results[i];
      if (r.isFinal) finalny += r[0].transcript;
      else tymczasowy += r[0].transcript;
    }

    // Podgląd na żywo (tylko przy dyktowaniu)
    if (this.dyktowanie && tymczasowy) {
      this.h.onLog && this.h.onLog('… ' + tymczasowy.trim());
    }

    if (!finalny) return;
    const tekst = finalny.trim();
    const norm = tekst.toLowerCase().replace(/[.,;!?]+$/, '').trim();

    // 1) Spróbuj dopasować komendę
    for (const k of KOMENDY) {
      const mm = norm.match(k.re);
      if (mm) {
        // W trybie dyktowania honorujemy tylko komendy zakończenia/akapitu
        if (this.dyktowanie && !['koniecDyktowania', 'nowyAkapit', 'wyczyscPole'].includes(k.cmd)) {
          break; // wpadnie do dyktowania poniżej
        }
        const arg = k.arg ? k.arg(mm) : undefined;
        this.h.onCommand && this.h.onCommand(k.cmd, arg, tekst);
        return;
      }
    }

    // 2) Brak komendy — jeśli dyktujemy, wpisz tekst do aktywnego pola
    if (this.dyktowanie) {
      this.h.onDictation && this.h.onDictation(tekst + ' ');
      return;
    }

    // 3) Poza trybem dyktowania nierozpoznana wypowiedź = log
    this.h.onLog && this.h.onLog('Nie rozpoznano komendy: „' + tekst + '”');
  }
}
