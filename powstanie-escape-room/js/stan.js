/* ==========================================================================
   stan.js — stan gry, zegar, zapis/odczyt (localStorage), osiągnięcia.
   ========================================================================== */

globalThis.GRA = globalThis.GRA || {};

(function () {
  const KLUCZ_ZAPISU = 'godzina-w-zapis-v1';

  const stan = {
    dane: null, // aktualny zapis gry (obiekt poniżej) lub null przed startem
  };

  function pustyZapis() {
    return {
      wersja: 1,
      rozpoczeto: Date.now(),
      pokoj: 0,                 // indeks aktualnego pokoju
      zbadane: {},              // { 'pokojId/hotspotId': true }
      rozwiazane: {},           // { pokojId: true }
      ekwipunek: [],            // [{id, nazwa, ikona, opis}]
      notatki: [],              // [{tytul, tekst}] — notatnik historyczny
      podpowiedzi: {},          // { pokojId: liczbaUzytych }
      uzytoPodpowiedzi: 0,
      karySekundy: 0,           // suma kar czasowych
      uplynietoSekundy: 0,      // czas gry naliczony przy ostatnim zapisie
      ostatniZnacznik: Date.now(), // do liczenia czasu między zapisami
      bledyKanaly: 0,
      pozycjaKanaly: 0,         // na którym skrzyżowaniu jesteśmy
      quizIndeks: 0,
      quizPoprawne: 0,
      quizBledy: 0,
      poCzasie: false,          // czy zegar zdążył dobić do zera
      zakonczono: false,
      osiagniecia: [],          // [id]
    };
  }

  /* ---------- cykl życia zapisu ---------- */

  stan.nowaGra = function () {
    stan.dane = pustyZapis();
    stan.zapisz();
  };

  stan.zapisz = function () {
    if (!stan.dane) return;
    const teraz = Date.now();
    // dolicz czas, który upłynął od ostatniego znacznika (gra aktywna)
    stan.dane.uplynietoSekundy += Math.max(0, (teraz - stan.dane.ostatniZnacznik) / 1000);
    stan.dane.ostatniZnacznik = teraz;
    try {
      localStorage.setItem(KLUCZ_ZAPISU, JSON.stringify(stan.dane));
    } catch (e) {
      /* brak localStorage (tryb prywatny) — gra działa dalej bez zapisu */
    }
  };

  stan.wczytaj = function () {
    try {
      const surowe = localStorage.getItem(KLUCZ_ZAPISU);
      if (!surowe) return false;
      const dane = JSON.parse(surowe);
      if (!dane || dane.wersja !== 1) return false;
      dane.ostatniZnacznik = Date.now(); // czas „poza grą” się nie liczy
      stan.dane = dane;
      return true;
    } catch (e) {
      return false;
    }
  };

  stan.jestZapis = function () {
    try {
      return !!localStorage.getItem(KLUCZ_ZAPISU);
    } catch (e) {
      return false;
    }
  };

  stan.usunZapis = function () {
    stan.dane = null;
    try { localStorage.removeItem(KLUCZ_ZAPISU); } catch (e) { /* j.w. */ }
  };

  /* ---------- zegar ---------- */

  // Ile sekund zostało na zegarze (63 min minus czas gry i kary).
  stan.pozostaloSekund = function () {
    const d = stan.dane;
    if (!d) return GRA.DANE.czasGrySekundy;
    const biezace = d.uplynietoSekundy + (Date.now() - d.ostatniZnacznik) / 1000;
    const zostalo = GRA.DANE.czasGrySekundy - biezace - d.karySekundy;
    return Math.max(0, Math.floor(zostalo));
  };

  stan.kara = function (sekundy) {
    if (!stan.dane) return;
    stan.dane.karySekundy += sekundy;
    stan.zapisz();
  };

  stan.formatCzasu = function (sekundy) {
    const m = Math.floor(sekundy / 60);
    const s = Math.floor(sekundy % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  /* ---------- ekwipunek i notatnik ---------- */

  stan.maPrzedmiot = function (id) {
    return !!stan.dane && stan.dane.ekwipunek.some((p) => p.id === id);
  };

  stan.dodajPrzedmiot = function (przedmiot) {
    if (!stan.dane || stan.maPrzedmiot(przedmiot.id)) return false;
    stan.dane.ekwipunek.push(przedmiot);
    stan.zapisz();
    return true;
  };

  stan.dodajNotatke = function (tytul, tekst) {
    if (!stan.dane) return;
    if (stan.dane.notatki.some((n) => n.tytul === tytul)) return;
    stan.dane.notatki.push({ tytul, tekst });
    stan.zapisz();
  };

  /* ---------- podpowiedzi ---------- */

  stan.podpowiedziUzyte = function (pokojId) {
    return (stan.dane && stan.dane.podpowiedzi[pokojId]) || 0;
  };

  stan.uzyjPodpowiedzi = function (pokojId) {
    if (!stan.dane) return null;
    stan.dane.podpowiedzi[pokojId] = stan.podpowiedziUzyte(pokojId) + 1;
    stan.dane.uzytoPodpowiedzi += 1;
    stan.kara(GRA.DANE.kary.podpowiedz);
    stan.zapisz();
    return stan.dane.podpowiedzi[pokojId];
  };

  /* ---------- osiągnięcia ---------- */

  stan.przyznaj = function (id) {
    if (!stan.dane) return false;
    if (stan.dane.osiagniecia.includes(id)) return false;
    if (!GRA.DANE.osiagniecia.some((o) => o.id === id)) return false;
    stan.dane.osiagniecia.push(id);
    stan.zapisz();
    return true;
  };

  // Czy zbadano wszystkie hotspoty we wszystkich pokojach?
  stan.wszystkoZbadane = function () {
    if (!stan.dane) return false;
    return GRA.DANE.pokoje.every((pokoj) =>
      (pokoj.hotspoty || []).every((h) => stan.dane.zbadane[`${pokoj.id}/${h.id}`])
    );
  };

  GRA.stan = stan;
})();
