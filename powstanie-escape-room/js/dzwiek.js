/* ==========================================================================
   dzwiek.js — dźwięki gry przez Web Audio API (bez plików audio):
   sygnały Morse'a, krótkie „kliknięcia” i fanfara sukcesu.
   ========================================================================== */

globalThis.GRA = globalThis.GRA || {};

(function () {
  const dzwiek = {
    wlaczony: true,
    _ctx: null,
    _graMorse: false,
  };

  // AudioContext wolno tworzyć dopiero po geście użytkownika.
  function ctx() {
    if (!dzwiek._ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      dzwiek._ctx = new AC();
    }
    if (dzwiek._ctx.state === 'suspended') dzwiek._ctx.resume();
    return dzwiek._ctx;
  }

  function ton(czestotliwosc, startZa, czasTrwania, glosnosc) {
    const c = ctx();
    if (!c || !dzwiek.wlaczony) return;
    const osc = c.createOscillator();
    const wzm = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = czestotliwosc;
    const t0 = c.currentTime + startZa;
    // łagodne narastanie/wygaszanie, żeby nie trzaskało
    wzm.gain.setValueAtTime(0.0001, t0);
    wzm.gain.linearRampToValueAtTime(glosnosc, t0 + 0.01);
    wzm.gain.setValueAtTime(glosnosc, t0 + czasTrwania - 0.01);
    wzm.gain.linearRampToValueAtTime(0.0001, t0 + czasTrwania);
    osc.connect(wzm).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + czasTrwania + 0.02);
  }

  dzwiek.klik = function () { ton(880, 0, 0.05, 0.06); };

  dzwiek.blad = function () { ton(180, 0, 0.25, 0.1); };

  dzwiek.sukces = function () {
    ton(523, 0.0, 0.12, 0.1);   // C5
    ton(659, 0.13, 0.12, 0.1);  // E5
    ton(784, 0.26, 0.25, 0.1);  // G5
  };

  dzwiek.osiagniecie = function () {
    ton(659, 0.0, 0.1, 0.09);
    ton(880, 0.12, 0.2, 0.09);
  };

  // Nadaje słowo alfabetem Morse'a (kropka 90 ms, kreska 3×kropka).
  // Zwraca łączny czas trwania w ms (do zablokowania przycisku „Odtwórz”).
  dzwiek.zagrajMorse = function (slowo) {
    const c = ctx();
    if (!c || !dzwiek.wlaczony || dzwiek._graMorse) return 0;
    const KROPKA = 0.09;
    const CZEST = 700;
    let t = 0.1;
    for (const litera of GRA.normalizuj(slowo)) {
      const kod = GRA.MORSE[litera];
      if (!kod) continue;
      for (const znak of kod) {
        const dl = znak === '-' ? KROPKA * 3 : KROPKA;
        ton(CZEST, t, dl, 0.12);
        t += dl + KROPKA; // przerwa między znakami = 1 kropka
      }
      t += KROPKA * 2; // przerwa między literami = 3 kropki (1 już doliczona)
    }
    dzwiek._graMorse = true;
    setTimeout(() => { dzwiek._graMorse = false; }, t * 1000);
    return Math.ceil(t * 1000);
  };

  GRA.dzwiek = dzwiek;
})();
