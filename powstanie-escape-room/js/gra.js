/* ==========================================================================
   gra.js — główna pętla gry: ekrany, pokoje, zagadki, zegar, zakończenie.
   Kolejność ładowania skryptów: dane.js → dzwiek.js → stan.js → ui.js → gra.js
   ========================================================================== */

globalThis.GRA = globalThis.GRA || {};

(function () {
  const { el, wyczysc, toast, modal } = GRA.ui;
  const stan = GRA.stan;
  let app = null;
  let zegarInterval = null;

  /* ======================= ZEGAR ======================= */

  function startZegara() {
    stopZegara();
    zegarInterval = setInterval(() => {
      const pole = document.getElementById('zegar');
      if (!pole || !stan.dane) return;
      const zostalo = stan.pozostaloSekund();
      pole.textContent = stan.formatCzasu(zostalo);
      pole.classList.toggle('zegar-malo', zostalo > 0 && zostalo <= 300);
      if (zostalo <= 0 && !stan.dane.poCzasie && !stan.dane.zakonczono) {
        stan.dane.poCzasie = true;
        stan.zapisz();
        pole.classList.add('zegar-koniec');
        modal({
          tytul: '⏰ Czas minął',
          tresc:
            '63 minuty dobiegły końca — tak jak 2 października 1944 r. dobiegło ' +
            'końca powstanie.\nMożesz dokończyć misję w trybie pamięci: gra ' +
            'toczy się dalej, a wynik zostanie oznaczony jako „po czasie”.',
          przyciski: [{ tekst: 'Graj dalej (tryb pamięci)' }],
        });
      }
    }, 500);
  }

  function stopZegara() {
    if (zegarInterval) { clearInterval(zegarInterval); zegarInterval = null; }
  }

  /* ======================= EKRAN STARTOWY ======================= */

  function ekranStart() {
    stopZegara();
    wyczysc(app);
    const D = GRA.DANE;

    const kotwica = el('div', { class: 'kotwica', 'aria-hidden': 'true' }, 'ⓅⓌ');

    const przyciski = el('div', { class: 'start-przyciski' });
    if (stan.jestZapis() && !zapisUkonczony()) {
      przyciski.append(el('button', {
        class: 'przycisk przycisk-glowny',
        onclick: () => { if (stan.wczytaj()) { startZegara(); renderPokoj(); } },
      }, '▶ Kontynuuj misję'));
    }
    przyciski.append(
      el('button', {
        class: 'przycisk ' + (stan.jestZapis() ? '' : 'przycisk-glowny'),
        onclick: nowaGraZPotwierdzeniem,
      }, '🕔 Nowa gra'),
      el('button', { class: 'przycisk', onclick: pokazJakGrac }, '❓ Jak grać'),
      el('button', { class: 'przycisk', onclick: pokazOProjekcie }, 'ℹ️ O projekcie'),
    );

    app.append(el('div', { class: 'ekran ekran-start' },
      kotwica,
      el('h1', { class: 'tytul' }, D.tytul),
      el('p', { class: 'podtytul' }, D.podtytul),
      el('p', { class: 'start-motto' },
        '„Chcieliśmy być wolni i wolność sobie zawdzięczać”'),
      przyciski,
      el('p', { class: 'stopka-start' },
        'Gra edukacyjna • 6 etapów • 63 minuty • Warszawa 1944'),
    ));
  }

  function zapisUkonczony() {
    // nie oferuj „Kontynuuj” dla zapisu, w którym grę już ukończono
    try {
      const d = JSON.parse(localStorage.getItem('godzina-w-zapis-v1'));
      return !!(d && d.zakonczono);
    } catch (e) { return false; }
  }

  function nowaGraZPotwierdzeniem() {
    if (stan.jestZapis() && !zapisUkonczony()) {
      modal({
        tytul: 'Zacząć od nowa?',
        tresc: 'Masz zapisaną misję w toku. Rozpoczęcie nowej gry usunie ten zapis.',
        przyciski: [
          { tekst: 'Wróć', klasa: '' },
          { tekst: 'Zacznij od nowa', klasa: 'przycisk-uwaga', akcja: () => { stan.usunZapis(); ekranIntro(); } },
        ],
      });
    } else {
      ekranIntro();
    }
  }

  function pokazJakGrac() {
    modal({
      tytul: '❓ Jak grać',
      tresc:
        '🔍 Badaj miejsca w każdym pokoju — kryją przedmioty, wskazówki i notatki historyczne.\n' +
        '🔐 Rozwiąż zagadkę pokoju, aby przejść dalej. Odpowiedzi wpisuj bez polskich znaków — wielkość liter nie ma znaczenia.\n' +
        '⏱️ Masz 63 minuty (po jednej za każdy dzień powstania). Podpowiedź kosztuje 2 minuty, błędna odpowiedź 30 sekund, zły skręt w kanałach 2 minuty.\n' +
        '💾 Gra zapisuje się automatycznie — możesz zamknąć kartę i wrócić później.\n' +
        '🎖️ Zbieraj osiągnięcia i czytaj notatnik: to, czego się nauczysz, zostaje po grze.',
    });
  }

  function pokazOProjekcie() {
    modal({
      tytul: 'ℹ️ O projekcie',
      tresc:
        'GODZINA „W” to edukacyjna gra przeglądarkowa typu escape room o Powstaniu ' +
        'Warszawskim (1 VIII – 2 X 1944), rozwijana jako projekt semestralny.\n' +
        'Wszystkie zagadki oparto na prawdziwych realiach: szyfrze harcerskim ' +
        'GA-DE-RY-PO-LU-KI, radiostacji „Błyskawica”, Harcerskiej Poczcie Polowej ' +
        'i ewakuacji kanałami ze Starówki.\n' +
        'Gra ma charakter edukacyjny i upamiętniający. Szczegóły, źródła ' +
        'historyczne i plan rozwoju znajdują się w dokumentacji projektu (katalog docs/).',
    });
  }

  /* ======================= INTRO ======================= */

  function ekranIntro() {
    wyczysc(app);
    const akapity = GRA.DANE.intro.map((t) => el('p', { class: 'intro-akapit' }, t));
    app.append(el('div', { class: 'ekran ekran-intro' },
      el('h2', {}, 'Rozkaz specjalny'),
      ...akapity,
      el('button', {
        class: 'przycisk przycisk-glowny',
        onclick: () => {
          stan.nowaGra();
          GRA.dzwiek.klik();
          startZegara();
          renderPokoj();
        },
      }, '🕔 Rozpocznij misję — uruchom zegar'),
    ));
  }

  /* ======================= PASEK GÓRNY ======================= */

  function pasekGorny() {
    const d = stan.dane;
    return el('header', { class: 'pasek' },
      el('div', { class: 'pasek-lewa' },
        el('span', { class: 'pasek-etap' }, `Etap ${GRA.DANE.pokoje[d.pokoj].etap}/${GRA.DANE.pokoje.length}`),
        el('span', { id: 'zegar', class: 'zegar', title: 'Pozostały czas' },
          stan.formatCzasu(stan.pozostaloSekund()))),
      el('div', { class: 'pasek-prawa' },
        el('button', { class: 'przycisk-ikona', title: 'Ekwipunek', onclick: GRA.ui.pokazEkwipunek }, '🎒'),
        el('button', { class: 'przycisk-ikona', title: 'Notatnik historyczny', onclick: GRA.ui.pokazNotatnik }, '📖'),
        el('button', {
          class: 'przycisk-ikona', title: 'Dźwięk wł./wył.',
          onclick: (zd) => {
            GRA.dzwiek.wlaczony = !GRA.dzwiek.wlaczony;
            zd.target.textContent = GRA.dzwiek.wlaczony ? '🔊' : '🔇';
          },
        }, GRA.dzwiek.wlaczony ? '🔊' : '🔇'),
        el('button', {
          class: 'przycisk-ikona', title: 'Przerwij (postęp zostanie zapisany)',
          onclick: () => { stan.zapisz(); ekranStart(); },
        }, '⏸')));
  }

  /* ======================= POKÓJ ======================= */

  function renderPokoj() {
    wyczysc(app);
    const d = stan.dane;
    const pokoj = GRA.DANE.pokoje[d.pokoj];

    const naglowek = el('div', { class: 'pokoj-naglowek' },
      el('h2', {}, pokoj.tytul),
      el('p', { class: 'pokoj-meta' }, `📅 ${pokoj.data}  •  📍 ${pokoj.miejsce}`),
      el('p', { class: 'pokoj-opis' }, pokoj.opis));

    const siatka = el('div', { class: 'hotspoty' });
    for (const h of (pokoj.hotspoty || [])) {
      const zbadany = !!d.zbadane[`${pokoj.id}/${h.id}`];
      siatka.append(el('button', {
        class: 'hotspot' + (zbadany ? ' hotspot-zbadany' : ''),
        onclick: () => zbadajHotspot(pokoj, h),
      },
        el('span', { class: 'hotspot-ikona' }, h.ikona),
        el('span', { class: 'hotspot-nazwa' }, h.nazwa),
        zbadany ? el('span', { class: 'hotspot-ptaszek' }, '✓') : null));
    }

    const panel = el('div', { class: 'panel-zagadki', id: 'panel-zagadki' });
    if (d.rozwiazane[pokoj.id]) {
      panel.append(przyciskDalej(pokoj));
    } else {
      renderZagadka(panel, pokoj);
    }

    app.append(
      pasekGorny(),
      el('main', { class: 'ekran ekran-pokoj' }, naglowek,
        (pokoj.hotspoty && pokoj.hotspoty.length)
          ? el('h3', { class: 'sekcja-tytul' }, '🔍 Rozejrzyj się')
          : null,
        siatka, panel));
  }

  function zbadajHotspot(pokoj, h) {
    const d = stan.dane;
    const klucz = `${pokoj.id}/${h.id}`;
    const pierwszyRaz = !d.zbadane[klucz];
    d.zbadane[klucz] = true;
    GRA.dzwiek.klik();

    const tresc = el('div', {}, el('p', {}, h.tekst));
    if (h.przedmiot && pierwszyRaz) {
      stan.dodajPrzedmiot(h.przedmiot);
      tresc.append(el('p', { class: 'zdobycz' },
        `${h.przedmiot.ikona} Zdobyto: ${h.przedmiot.nazwa}`));
    }
    if (h.notatkaTytul) stan.dodajNotatke(h.notatkaTytul, h.tekst);
    stan.zapisz();

    // odśwież widok po zamknięciu modala (ptaszek na hotspocie)
    modal({
      tytul: `${h.ikona} ${h.nazwa}`,
      tresc,
      przyciski: [{ tekst: 'Dalej', akcja: () => sprawdzKronikarza() || renderPokoj() }],
    });
  }

  function sprawdzKronikarza() {
    if (stan.wszystkoZbadane() && stan.przyznaj('kronikarz')) {
      GRA.ui.pokazOsiagniecie('kronikarz');
    }
    return false;
  }

  function przyciskDalej(pokoj) {
    const ostatni = stan.dane.pokoj >= GRA.DANE.pokoje.length - 1;
    return el('div', { class: 'zagadka-rozwiazana' },
      el('p', { class: 'sukces-tekst' }, '✅ Zagadka rozwiązana.'),
      el('button', {
        class: 'przycisk przycisk-glowny',
        onclick: () => {
          GRA.dzwiek.klik();
          if (ostatni) { ekranKoniec(); return; }
          stan.dane.pokoj += 1;
          stan.zapisz();
          renderPokoj();
        },
      }, ostatni ? '🎖️ Zakończ misję' : '➡ Idź dalej'));
  }

  /* ======================= ZAGADKI ======================= */

  function renderZagadka(panel, pokoj) {
    const z = pokoj.zagadka;
    panel.append(el('h3', { class: 'sekcja-tytul' }, `🔐 ${z.naglowek}`));
    if (z.typ === 'kod' || z.typ === 'morse') renderZagadkaKod(panel, pokoj);
    else if (z.typ === 'kanaly') renderKanaly(panel, pokoj);
    else if (z.typ === 'quiz') renderQuiz(panel, pokoj);
  }

  /* ---------- zagadka z kodem / morse ---------- */

  function renderZagadkaKod(panel, pokoj) {
    const z = pokoj.zagadka;
    panel.append(el('p', { class: 'zagadka-pytanie' }, z.pytanie));

    if (z.typ === 'morse') {
      panel.append(el('div', { class: 'morse-zapis', 'aria-label': 'Zapis Morse’a' },
        GRA.morseZapis(z.slowo)));
      const przyciskOdtworz = el('button', {
        class: 'przycisk',
        onclick: () => {
          const ms = GRA.dzwiek.zagrajMorse(z.slowo);
          if (ms > 0) {
            przyciskOdtworz.disabled = true;
            setTimeout(() => { przyciskOdtworz.disabled = false; }, ms);
          } else if (!GRA.dzwiek.wlaczony) {
            toast('Dźwięk jest wyłączony — włącz go ikoną 🔊 na pasku.');
          }
        },
      }, '🔊 Odtwórz sygnał');
      panel.append(el('div', { class: 'morse-akcje' },
        przyciskOdtworz,
        el('button', { class: 'przycisk', onclick: GRA.ui.pokazTabeleMorse }, '📜 Tabela Morse’a')));
    }

    const pole = el('input', {
      class: 'pole-odpowiedzi', type: 'text',
      placeholder: z.placeholder || 'Odpowiedź…',
      'aria-label': 'Odpowiedź',
      autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
    });
    pole.addEventListener('keydown', (zd) => { if (zd.key === 'Enter') sprawdz(); });

    function sprawdz() {
      const odp = GRA.normalizuj(pole.value);
      if (!odp) { toast('Wpisz odpowiedź.'); return; }
      if (z.odpowiedzi.map(GRA.normalizuj).includes(odp)) {
        rozwiazano(pokoj);
      } else {
        GRA.dzwiek.blad();
        stan.kara(GRA.DANE.kary.blednaOdpowiedz);
        toast(`❌ To nie to. Kara: −${GRA.DANE.kary.blednaOdpowiedz} s. Zbadaj miejsca w pokoju!`, 'toast-blad');
        pole.select();
      }
    }

    panel.append(
      el('div', { class: 'zagadka-formularz' },
        pole,
        el('button', { class: 'przycisk przycisk-glowny', onclick: sprawdz }, 'Sprawdź')),
      przyciskPodpowiedzi(pokoj));
  }

  function przyciskPodpowiedzi(pokoj) {
    const z = pokoj.zagadka;
    if (!z.podpowiedzi || !z.podpowiedzi.length) return null;
    const kontener = el('div', { class: 'podpowiedzi' });
    const uzyte = stan.podpowiedziUzyte(pokoj.id);
    for (let i = 0; i < uzyte && i < z.podpowiedzi.length; i++) {
      kontener.append(el('p', { class: 'podpowiedz' }, `💡 ${z.podpowiedzi[i]}`));
    }
    if (uzyte < z.podpowiedzi.length) {
      kontener.append(el('button', {
        class: 'przycisk przycisk-cichy',
        onclick: () => {
          modal({
            tytul: '💡 Podpowiedź',
            tresc: `Użycie podpowiedzi kosztuje ${GRA.DANE.kary.podpowiedz / 60} minuty. ` +
              `(Wykorzystano ${uzyte} z ${z.podpowiedzi.length}).`,
            przyciski: [
              { tekst: 'Jednak nie' },
              {
                tekst: 'Pokaż podpowiedź (−2 min)',
                klasa: 'przycisk-glowny',
                akcja: () => { stan.uzyjPodpowiedzi(pokoj.id); renderPokoj(); },
              },
            ],
          });
        },
      }, `💡 Podpowiedź (${uzyte}/${z.podpowiedzi.length}) — koszt 2 min`));
    }
    return kontener;
  }

  /* ---------- kanały (labirynt) ---------- */

  function renderKanaly(panel, pokoj) {
    const z = pokoj.zagadka;
    const d = stan.dane;

    // wymagane przedmioty — w liniowej rozgrywce gracz je ma; komunikat
    // zostaje na wypadek zmian w projektowaniu poziomów
    const brak = (pokoj.wymagane || []).filter((id) => !stan.maPrzedmiot(id));
    if (brak.length) {
      panel.append(el('p', { class: 'zagadka-pytanie' },
        '⚠️ Czegoś Ci brakuje, by zejść do kanału. Wróć i przeszukaj poprzednie miejsca.'));
      return;
    }

    const krok = d.pozycjaKanaly;
    const razem = z.sciezka.length;

    const postep = el('div', { class: 'kanaly-postep' },
      Array.from({ length: razem }, (_, i) =>
        el('span', {
          class: 'kanaly-krok' + (i < krok ? ' kanaly-krok-za' : i === krok ? ' kanaly-krok-tu' : ''),
        }, String(i + 1))));

    panel.append(
      postep,
      el('p', { class: 'zagadka-pytanie' }, z.skrzyzowania[krok]),
      el('p', { class: 'kanaly-mapa-info' },
        '🗺️ Masz plan kanałów w trzech częściach — sprawdź go w ekwipunku (🎒).'));

    function wybierz(kierunek) {
      GRA.dzwiek.klik();
      if (kierunek === z.sciezka[krok]) {
        d.pozycjaKanaly += 1;
        stan.zapisz();
        if (d.pozycjaKanaly >= razem) {
          if (d.bledyKanaly === 0 && stan.przyznaj('kanalarz')) {
            GRA.ui.pokazOsiagniecie('kanalarz');
          }
          rozwiazano(pokoj);
        } else {
          toast('✔ Dobry kierunek. Idziesz dalej po ciemku…');
          renderPokoj();
        }
      } else {
        d.bledyKanaly += 1;
        stan.kara(GRA.DANE.kary.blednyKanal);
        GRA.dzwiek.blad();
        modal({
          tytul: '🚧 Zły skręt',
          tresc: z.zlySkret + `\nKara: −${GRA.DANE.kary.blednyKanal / 60} minuty.`,
          przyciski: [{ tekst: 'Zawróć', akcja: renderPokoj }],
        });
      }
    }

    panel.append(el('div', { class: 'kanaly-przyciski' },
      el('button', { class: 'przycisk przycisk-kierunek', onclick: () => wybierz('L') }, '⬅ W LEWO'),
      el('button', { class: 'przycisk przycisk-kierunek', onclick: () => wybierz('P') }, 'W PRAWO ➡')));
  }

  /* ---------- quiz (odprawa) ---------- */

  function renderQuiz(panel, pokoj) {
    const z = pokoj.zagadka;
    const d = stan.dane;
    const nr = d.quizIndeks;
    const pytanie = z.pytania[nr];

    panel.append(
      el('p', { class: 'quiz-licznik' }, `Pytanie ${nr + 1} z ${z.pytania.length}`),
      el('p', { class: 'zagadka-pytanie quiz-pytanie' }, pytanie.p));

    // odpowiedzi w losowej kolejności — ale stabilnej dla danego pytania,
    // żeby odświeżenie strony nie tasowało ich na nowo
    const kolejnosc = pytanie.odp
      .map((tekst, i) => ({ tekst, i }))
      .sort((a, b) => ((a.tekst.length * 7 + a.i) % 5) - ((b.tekst.length * 7 + b.i) % 5));

    const lista = el('div', { class: 'quiz-odpowiedzi' });
    for (const { tekst, i } of kolejnosc) {
      lista.append(el('button', {
        class: 'przycisk quiz-odp',
        onclick: () => {
          const dobrze = i === pytanie.poprawna;
          if (dobrze) { d.quizPoprawne += 1; GRA.dzwiek.sukces(); }
          else {
            d.quizBledy += 1;
            stan.kara(GRA.DANE.kary.blednaOdpowiedz);
            GRA.dzwiek.blad();
          }
          d.quizIndeks += 1;
          stan.zapisz();
          modal({
            tytul: dobrze ? '✅ Dobrze!' : '❌ Niestety nie',
            tresc: (dobrze ? '' : `Poprawna odpowiedź: ${pytanie.odp[pytanie.poprawna]}.\n`) +
              pytanie.wyjasnienie,
            zamykalny: false,
            przyciski: [{
              tekst: d.quizIndeks < z.pytania.length ? 'Następne pytanie' : 'Zakończ odprawę',
              akcja: () => {
                if (d.quizIndeks < z.pytania.length) { renderPokoj(); return; }
                if (d.quizBledy === 0 && stan.przyznaj('quiz-perfekt')) {
                  GRA.ui.pokazOsiagniecie('quiz-perfekt');
                }
                rozwiazano(pokoj);
              },
            }],
          });
        },
      }, tekst));
    }
    panel.append(lista);
  }

  /* ---------- wspólne zakończenie zagadki ---------- */

  function rozwiazano(pokoj) {
    const z = pokoj.zagadka;
    const d = stan.dane;
    d.rozwiazane[pokoj.id] = true;
    if (z.przedmiotZaNagrode) stan.dodajPrzedmiot(z.przedmiotZaNagrode);
    if (z.nota) stan.dodajNotatke(z.nota.tytul, z.nota.tekst);
    stan.zapisz();
    GRA.dzwiek.sukces();

    const tresc = el('div', {},
      el('p', { class: 'sukces-tekst' }, z.sukces),
      z.przedmiotZaNagrode
        ? el('p', { class: 'zdobycz' },
          `${z.przedmiotZaNagrode.ikona} Zdobyto: ${z.przedmiotZaNagrode.nazwa}`)
        : null,
      z.nota
        ? el('div', { class: 'nota-historyczna' },
          el('h4', {}, `📖 Czy wiesz, że… — ${z.nota.tytul}`),
          el('p', {}, z.nota.tekst),
          el('p', { class: 'nota-dopisek' }, 'Notatka trafiła do Twojego notatnika (📖).'))
        : null);

    modal({
      tytul: '🔓 Zagadka rozwiązana!',
      tresc,
      zamykalny: false,
      przyciski: [{ tekst: 'Dalej', klasa: 'przycisk-glowny', akcja: renderPokoj }],
    });
  }

  /* ======================= ZAKOŃCZENIE ======================= */

  function ekranKoniec() {
    const d = stan.dane;
    const K = GRA.DANE.zakonczenie;
    d.zakonczono = true;

    // osiągnięcia końcowe
    stan.przyznaj('ukonczenie');
    if (d.uzytoPodpowiedzi === 0) stan.przyznaj('bez-podpowiedzi');
    if (!d.poCzasie && stan.pozostaloSekund() > 30 * 60) stan.przyznaj('przed-czasem');
    stan.zapisz();
    stopZegara();
    wyczysc(app);

    const pozostalo = stan.pozostaloSekund();
    const statystyki = el('div', { class: 'statystyki' },
      wierszStat('⏱️ Pozostały czas', d.poCzasie ? 'po czasie' : stan.formatCzasu(pozostalo)),
      wierszStat('💡 Użyte podpowiedzi', String(d.uzytoPodpowiedzi)),
      wierszStat('🕳️ Błędne skręty w kanałach', String(d.bledyKanaly)),
      wierszStat('🎓 Odprawa (quiz)', `${d.quizPoprawne}/${d.quizPoprawne + d.quizBledy} poprawnych`),
      wierszStat('📖 Notatki historyczne', String(d.notatki.length)));

    const siatkaOs = el('div', { class: 'osiagniecia' });
    for (const o of GRA.DANE.osiagniecia) {
      const zdobyte = d.osiagniecia.includes(o.id);
      siatkaOs.append(el('div', {
        class: 'osiagniecie' + (zdobyte ? ' osiagniecie-zdobyte' : ''),
        title: o.opis,
      },
        el('span', { class: 'osiagniecie-ikona' }, zdobyte ? o.ikona : '🔒'),
        el('span', {}, o.nazwa)));
    }

    app.append(el('div', { class: 'ekran ekran-koniec' },
      el('div', { class: 'kotwica', 'aria-hidden': 'true' }, 'ⓅⓌ'),
      el('h1', {}, K.tytul),
      el('p', { class: 'intro-akapit' }, d.poCzasie ? K.poCzasie : K.tekst),
      el('h3', { class: 'sekcja-tytul' }, '📊 Twoja misja'),
      statystyki,
      el('h3', { class: 'sekcja-tytul' }, '🎖️ Osiągnięcia'),
      siatkaOs,
      el('div', { class: 'start-przyciski' },
        el('button', { class: 'przycisk', onclick: GRA.ui.pokazNotatnik }, '📖 Notatnik historyczny'),
        el('button', {
          class: 'przycisk przycisk-glowny',
          onclick: () => { stan.usunZapis(); ekranIntro(); },
        }, '🔁 Zagraj jeszcze raz'),
        el('button', { class: 'przycisk', onclick: ekranStart }, '🏠 Ekran startowy')),
      el('p', { class: 'stopka-start' },
        'Cześć ich pamięci. • 1 VIII 1944, godz. 17.00 — pamiętamy.')));
  }

  function wierszStat(etykieta, wartosc) {
    return el('div', { class: 'stat' },
      el('span', {}, etykieta), el('strong', {}, wartosc));
  }

  /* ======================= START ======================= */

  document.addEventListener('DOMContentLoaded', () => {
    app = document.getElementById('app');
    // zapisuj czas także przy zamykaniu/ukrywaniu karty
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') stan.zapisz();
    });
    ekranStart();
  });
})();
