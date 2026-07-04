/* ============================================================
 * Gry historyczne — klasa IV
 * Logika trzech gier: Wisielec, Va Banque, Gra zręcznościowa.
 * Dane wczytywane z dane.js (window.GRA_DANE).
 * ============================================================ */
(function () {
  'use strict';

  const DANE = window.GRA_DANE;
  const $ = (id) => document.getElementById(id);

  // Losowanie i tasowanie
  const losuj = (n) => Math.floor(Math.random() * n);
  function tasuj(tab) {
    const a = tab.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = losuj(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ——————————————————————————————————————————————
  // Nawigacja między ekranami
  // ——————————————————————————————————————————————
  const Gry = {
    pokaz(nazwa) {
      document.querySelectorAll('.ekran').forEach((e) => e.classList.remove('aktywny'));
      $('ekran-' + nazwa).classList.add('aktywny');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (nazwa === 'wisielec') Wisielec.nowaGra();
      if (nazwa === 'vabanque') VaBanque.start();
      if (nazwa === 'arcade') Arcade.przygotuj();
    },
    doMenu() {
      if (Arcade.dziala) Arcade.stop();
      document.querySelectorAll('.ekran').forEach((e) => e.classList.remove('aktywny'));
      $('ekran-menu').classList.add('aktywny');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  };

  // ——————————————————————————————————————————————
  // GRA 1: WISIELEC
  // ——————————————————————————————————————————————
  const RYSUNKI = [
    '  +---+\n      |\n      |\n      |\n     ===',
    '  +---+\n  O   |\n      |\n      |\n     ===',
    '  +---+\n  O   |\n  |   |\n      |\n     ===',
    '  +---+\n  O   |\n /|   |\n      |\n     ===',
    '  +---+\n  O   |\n /|\\  |\n      |\n     ===',
    '  +---+\n  O   |\n /|\\  |\n /    |\n     ===',
    '  +---+\n  O   |\n /|\\  |\n / \\  |\n     ===',
  ];
  const ALFABET = 'AĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻ'.split('');

  const Wisielec = {
    slowo: '', wskazowka: '', odgadniete: new Set(), bledy: 0, maxBledy: 6, punkty: 0, koniec: false,

    nowaGra() {
      const h = DANE.HASLA[losuj(DANE.HASLA.length)];
      this.slowo = h.slowo.toUpperCase();
      this.wskazowka = h.wskazowka;
      this.odgadniete = new Set();
      this.bledy = 0;
      this.koniec = false;
      $('w-wskazowka').textContent = this.wskazowka;
      $('w-komunikat').textContent = '';
      $('w-komunikat').style.color = '';
      $('w-akcje').classList.add('ukryty');
      this.rysujKlawiature();
      this.aktualizuj();
    },

    rysujKlawiature() {
      const k = $('w-klawiatura');
      k.innerHTML = '';
      ALFABET.forEach((lit) => {
        const b = document.createElement('button');
        b.className = 'litera';
        b.textContent = lit;
        b.onclick = () => this.zgadnij(lit, b);
        k.appendChild(b);
      });
    },

    zgadnij(lit, przycisk) {
      if (this.koniec) return;
      przycisk.disabled = true;
      if (this.slowo.includes(lit)) {
        this.odgadniete.add(lit);
        przycisk.classList.add('trafiona');
      } else {
        this.bledy++;
        przycisk.classList.add('pudlo');
      }
      this.aktualizuj();
      this.sprawdzKoniec();
    },

    maskaSlowa() {
      // Litery bez znaków diakrytycznych też pokazujemy poprawnie —
      // porównujemy dokładnie te znaki, które są w haśle.
      return this.slowo
        .split('')
        .map((z) => (z === ' ' ? ' ' : this.odgadniete.has(z) ? z : '_'))
        .join(' ');
    },

    aktualizuj() {
      $('w-rysunek').textContent = RYSUNKI[Math.min(this.bledy, RYSUNKI.length - 1)];
      $('w-zycia').textContent = Math.max(0, this.maxBledy - this.bledy);
      $('w-slowo').textContent = this.maskaSlowa();
      $('w-punkty').textContent = this.punkty;
    },

    sprawdzKoniec() {
      const wygrana = this.slowo.split('').every((z) => z === ' ' || this.odgadniete.has(z));
      if (wygrana) {
        this.koniec = true;
        const zdobyte = 10 + (this.maxBledy - this.bledy) * 5; // bonus za mało błędów
        this.punkty += zdobyte;
        this.pokazKomunikat('🎉 Brawo! Hasło odgadnięte. +' + zdobyte + ' pkt', 'var(--ok)');
      } else if (this.bledy >= this.maxBledy) {
        this.koniec = true;
        $('w-slowo').textContent = this.slowo.split('').join(' ');
        this.pokazKomunikat('😢 Koniec szans. Hasło to: ' + this.slowo, 'var(--del)');
      }
      this.aktualizuj();
    },

    pokazKomunikat(txt, kolor) {
      $('w-komunikat').textContent = txt;
      $('w-komunikat').style.color = kolor;
      $('w-akcje').classList.remove('ukryty');
      document.querySelectorAll('#w-klawiatura .litera').forEach((b) => (b.disabled = true));
    },
  };

  // ——————————————————————————————————————————————
  // GRA 2: VA BANQUE (teleturniej)
  // ——————————————————————————————————————————————
  const VaBanque = {
    punkty: 0, pozostale: 0, aktualne: null,

    start() {
      this.punkty = 0;
      this.pozostale = 0;
      $('v-koniec').classList.add('ukryty');
      $('v-pytanie-widok').classList.add('ukryty');
      $('v-plansza-widok').classList.remove('ukryty');
      this.rysujPlansze();
      this.aktualizujPunkty();
    },

    rysujPlansze() {
      const plansza = $('v-plansza');
      plansza.innerHTML = '';
      // nagłówki kategorii
      DANE.KATEGORIE.forEach((kat) => {
        const h = document.createElement('div');
        h.className = 'naglowek-kat';
        h.textContent = kat.nazwa;
        plansza.appendChild(h);
      });
      // wiersze kwot (5 poziomów), kolumny = kategorie
      const liczbaPoziomow = 5;
      for (let poziom = 0; poziom < liczbaPoziomow; poziom++) {
        DANE.KATEGORIE.forEach((kat, kolumna) => {
          const pyt = kat.pytania[poziom];
          const c = document.createElement('div');
          c.className = 'kwota';
          c.textContent = pyt.p;
          c.dataset.kat = kolumna;
          c.dataset.poziom = poziom;
          c.onclick = () => this.wybierz(c, kat.nazwa, pyt);
          plansza.appendChild(c);
          this.pozostale++;
        });
      }
    },

    wybierz(komorka, nazwaKat, pyt) {
      if (komorka.classList.contains('uzyta')) return;
      this.aktualne = { komorka, pyt };
      $('v-plansza-widok').classList.add('ukryty');
      $('v-pytanie-widok').classList.remove('ukryty');
      $('v-etykieta').textContent = nazwaKat + ' — ' + pyt.p + ' pkt';
      $('v-tresc').textContent = pyt.q;
      $('v-komunikat').textContent = '';
      $('v-wroc').classList.add('ukryty');

      const box = $('v-odpowiedzi');
      box.innerHTML = '';
      // Tasujemy odpowiedzi, ale pamiętamy, która jest poprawna.
      const poprawna = pyt.o[pyt.k];
      tasuj(pyt.o).forEach((tekst) => {
        const b = document.createElement('button');
        b.className = 'odp';
        b.textContent = tekst;
        b.onclick = () => this.odpowiedz(b, tekst === poprawna, poprawna, pyt.p);
        box.appendChild(b);
      });
    },

    odpowiedz(przycisk, dobrze, poprawna, wartosc) {
      const przyciski = document.querySelectorAll('#v-odpowiedzi .odp');
      przyciski.forEach((b) => {
        b.disabled = true;
        if (b.textContent === poprawna) b.classList.add('dobrze');
      });
      if (dobrze) {
        this.punkty += wartosc;
        $('v-komunikat').textContent = '✔️ Dobra odpowiedź! +' + wartosc + ' pkt';
        $('v-komunikat').style.color = 'var(--ok)';
      } else {
        przycisk.classList.add('zle');
        this.punkty -= wartosc;
        $('v-komunikat').textContent = '❌ Niestety nie. Poprawnie: ' + poprawna + ' (−' + wartosc + ' pkt)';
        $('v-komunikat').style.color = 'var(--del)';
      }
      this.aktualne.komorka.classList.add('uzyta');
      this.pozostale--;
      this.aktualizujPunkty();
      $('v-wroc').classList.remove('ukryty');
    },

    wrocDoPlanszy() {
      if (this.pozostale <= 0) {
        this.koniec();
        return;
      }
      $('v-pytanie-widok').classList.add('ukryty');
      $('v-plansza-widok').classList.remove('ukryty');
    },

    koniec() {
      $('v-pytanie-widok').classList.add('ukryty');
      $('v-plansza-widok').classList.add('ukryty');
      $('v-koniec').classList.remove('ukryty');
      let ocena;
      if (this.punkty >= 5000) ocena = '🏆 Mistrz historii! Wspaniały wynik!';
      else if (this.punkty >= 3000) ocena = '🥇 Świetnie! Dużo już wiesz.';
      else if (this.punkty >= 1000) ocena = '🙂 Dobrze! Powtórz kilka tematów i będzie jeszcze lepiej.';
      else ocena = '💪 Nie poddawaj się — spróbuj jeszcze raz!';
      $('v-koniec-tekst').textContent = 'Twój wynik: ' + this.punkty + ' pkt. ' + ocena;
    },

    aktualizujPunkty() {
      $('v-punkty').textContent = this.punkty;
    },
  };

  // ——————————————————————————————————————————————
  // GRA 3: ZRĘCZNOŚCIOWA — "Łap odpowiedź"
  // ——————————————————————————————————————————————
  const Arcade = {
    canvas: null, ctx: null, W: 640, H: 420,
    dziala: false, animId: null,
    kosz: null, spadajace: [], pytanie: null,
    zycia: 3, poziom: 1, trafienia: 0, predkosc: 1.2,
    ruchLewo: false, ruchPrawo: false, kolejka: [],

    przygotuj() {
      this.canvas = $('plansza-arcade');
      this.ctx = this.canvas.getContext('2d');
      this.W = this.canvas.width;
      this.H = this.canvas.height;
      this.dziala = false;
      this.zycia = 3; this.poziom = 1; this.trafienia = 0;
      this.kosz = { x: this.W / 2 - 45, w: 90, h: 20, v: 7 };
      this.spadajace = [];
      this.aktualizujHUD();
      $('a-pytanie').textContent = 'Naciśnij „Start”, aby zagrać!';
      $('a-start').textContent = '▶ Start';
      this.rysujStatyczne();
      this.podepnijSterowanie();
    },

    podepnijSterowanie() {
      if (this._sterowaniePodpiete) return;
      this._sterowaniePodpiete = true;

      document.addEventListener('keydown', (e) => {
        if (!this.dziala) return;
        if (e.key === 'ArrowLeft') { this.ruchLewo = true; e.preventDefault(); }
        if (e.key === 'ArrowRight') { this.ruchPrawo = true; e.preventDefault(); }
      });
      document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft') this.ruchLewo = false;
        if (e.key === 'ArrowRight') this.ruchPrawo = false;
      });

      const przL = $('a-lewo'), przP = $('a-prawo');
      const wcisnij = (flaga, stan) => () => { this[flaga] = stan; };
      ['mousedown', 'touchstart'].forEach((ev) => {
        przL.addEventListener(ev, (e) => { e.preventDefault(); this.ruchLewo = true; });
        przP.addEventListener(ev, (e) => { e.preventDefault(); this.ruchPrawo = true; });
      });
      ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach((ev) => {
        przL.addEventListener(ev, () => { this.ruchLewo = false; });
        przP.addEventListener(ev, () => { this.ruchPrawo = false; });
      });

      // Sterowanie palcem/myszą bezpośrednio na planszy
      const przesun = (clientX) => {
        const r = this.canvas.getBoundingClientRect();
        const x = (clientX - r.left) * (this.W / r.width);
        this.kosz.x = Math.max(0, Math.min(this.W - this.kosz.w, x - this.kosz.w / 2));
      };
      this.canvas.addEventListener('mousemove', (e) => { if (this.dziala && e.buttons) przesun(e.clientX); });
      this.canvas.addEventListener('touchmove', (e) => {
        if (this.dziala) { e.preventDefault(); przesun(e.touches[0].clientX); }
      }, { passive: false });
    },

    start() {
      if (this.dziala) return;
      this.przygotuj();
      this.dziala = true;
      $('a-start').textContent = '⏸ Gra trwa…';
      this.kolejka = tasuj(DANE.WSZYSTKIE_PYTANIA);
      this.nowePytanie();
      const petla = () => {
        if (!this.dziala) return;
        this.krok();
        this.animId = requestAnimationFrame(petla);
      };
      this.animId = requestAnimationFrame(petla);
    },

    stop() {
      this.dziala = false;
      if (this.animId) cancelAnimationFrame(this.animId);
    },

    nowePytanie() {
      if (this.kolejka.length === 0) this.kolejka = tasuj(DANE.WSZYSTKIE_PYTANIA);
      this.pytanie = this.kolejka.pop();
      $('a-pytanie').textContent = this.pytanie.q;
      this.spadajace = [];

      // Tworzymy spadające bąbelki: 1 poprawny + błędne, w losowych kolumnach.
      const poprawna = this.pytanie.o[this.pytanie.k];
      const opcje = tasuj(this.pytanie.o);
      const kolumny = tasuj(opcje.map((_, i) => i));
      const szer = this.W / opcje.length;
      opcje.forEach((tekst, i) => {
        this.spadajace.push({
          tekst,
          poprawna: tekst === poprawna,
          x: kolumny[i] * szer + szer / 2,
          y: -30 - losuj(140),
          r: 34,
          zlapana: false,
        });
      });
    },

    krok() {
      // ruch kosza
      if (this.ruchLewo) this.kosz.x -= this.kosz.v;
      if (this.ruchPrawo) this.kosz.x += this.kosz.v;
      this.kosz.x = Math.max(0, Math.min(this.W - this.kosz.w, this.kosz.x));

      const koszY = this.H - this.kosz.h - 6;
      let trzebaNowePytanie = false;

      for (const b of this.spadajace) {
        if (b.zlapana) continue;
        b.y += this.predkosc + this.poziom * 0.25;

        // kolizja z koszem
        if (b.y + b.r >= koszY && b.x >= this.kosz.x - b.r * 0.3 && b.x <= this.kosz.x + this.kosz.w + b.r * 0.3) {
          b.zlapana = true;
          if (b.poprawna) {
            this.trafienia++;
            if (this.trafienia % 3 === 0) this.poziom++;
            trzebaNowePytanie = true;
          } else {
            this.zabierzZycie();
          }
        } else if (b.y - b.r > this.H) {
          b.zlapana = true; // spadło poza ekran
          if (b.poprawna) {
            // przegapiona poprawna odpowiedź = strata życia
            this.zabierzZycie();
            trzebaNowePytanie = true;
          }
        }
      }

      // jeśli wszystkie bąbelki opuściły planszę bez złapania poprawnej — nowe pytanie
      const aktywne = this.spadajace.some((b) => !b.zlapana);
      if (!trzebaNowePytanie && !aktywne) trzebaNowePytanie = true;

      this.rysuj();
      this.aktualizujHUD();

      if (trzebaNowePytanie && this.dziala) this.nowePytanie();
    },

    zabierzZycie() {
      this.zycia--;
      if (this.zycia <= 0) this.przegrana();
    },

    przegrana() {
      this.stop();
      $('a-pytanie').textContent = '💥 Koniec gry! Zdobyte trafienia: ' + this.trafienia + '. Naciśnij „Start”, by zagrać ponownie.';
      $('a-start').textContent = '▶ Zagraj znów';
    },

    rysujStatyczne() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.W, this.H);
      this.rysujKosz();
    },

    rysuj() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.W, this.H);
      // bąbelki
      this.spadajace.forEach((b) => {
        if (b.zlapana) return;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#1f6feb';
        ctx.lineWidth = 3;
        ctx.fill();
        ctx.stroke();
        // tekst (zawijany do koła)
        ctx.fillStyle = '#20303f';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        this.tekstWKole(b.tekst, b.x, b.y, b.r);
      });
      this.rysujKosz();
    },

    tekstWKole(tekst, cx, cy, r) {
      const ctx = this.ctx;
      const slowa = tekst.split(' ');
      const linie = [];
      let biezaca = '';
      slowa.forEach((s) => {
        const test = biezaca ? biezaca + ' ' + s : s;
        if (ctx.measureText(test).width > r * 1.7 && biezaca) {
          linie.push(biezaca);
          biezaca = s;
        } else {
          biezaca = test;
        }
      });
      if (biezaca) linie.push(biezaca);
      const lh = 13;
      const start = cy - ((linie.length - 1) * lh) / 2;
      linie.forEach((l, i) => ctx.fillText(l, cx, start + i * lh));
    },

    rysujKosz() {
      const ctx = this.ctx;
      const y = this.H - this.kosz.h - 6;
      ctx.fillStyle = '#7b3fe4';
      ctx.strokeStyle = '#5a2bb0';
      ctx.lineWidth = 3;
      const x = this.kosz.x, w = this.kosz.w, h = this.kosz.h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w - 8, y + h);
      ctx.lineTo(x + 8, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // uchwyt koszyka
      ctx.beginPath();
      ctx.arc(x + w / 2, y, w / 2 - 4, Math.PI, 0);
      ctx.stroke();
    },

    aktualizujHUD() {
      $('a-zycia').textContent = this.zycia;
      $('a-poziom').textContent = this.poziom;
      $('a-trafienia').textContent = this.trafienia;
      $('a-punkty').textContent = this.trafienia * 10;
    },
  };

  // Udostępnienie na zewnątrz (dla onclick w HTML)
  window.Gry = Gry;
  window.Wisielec = Wisielec;
  window.VaBanque = VaBanque;
  window.Arcade = Arcade;
})();
