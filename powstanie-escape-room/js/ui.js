/* ==========================================================================
   ui.js — drobne narzędzia interfejsu: tworzenie elementów, modale, toasty,
   górny pasek (zegar, ekwipunek, notatnik), tabele pomocnicze.
   ========================================================================== */

globalThis.GRA = globalThis.GRA || {};

(function () {
  const ui = {};

  /* ---------- tworzenie elementów ---------- */

  // el('div', {class: 'x', onclick: fn}, dziecko1, 'tekst', ...)
  ui.el = function (tag, atrybuty, ...dzieci) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(atrybuty || {})) {
      if (k.startsWith('on') && typeof v === 'function') {
        e.addEventListener(k.slice(2), v);
      } else if (k === 'class') {
        e.className = v;
      } else if (v !== null && v !== undefined && v !== false) {
        e.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const d of dzieci.flat()) {
      if (d === null || d === undefined || d === false) continue;
      e.append(d.nodeType ? d : document.createTextNode(String(d)));
    }
    return e;
  };

  ui.wyczysc = function (element) {
    while (element.firstChild) element.removeChild(element.firstChild);
  };

  /* ---------- toast ---------- */

  let toastTimer = null;
  ui.toast = function (tekst, klasa) {
    const t = document.getElementById('toast');
    t.textContent = tekst;
    t.className = 'toast widoczny' + (klasa ? ' ' + klasa : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast'; }, 3200);
  };

  /* ---------- modale ---------- */

  // Pokazuje modal; zwraca funkcję zamykającą. opcje: {tytul, tresc (Node|string),
  // przyciski: [{tekst, klasa, akcja}], zamykalny}
  ui.modal = function (opcje) {
    const tlo = ui.el('div', { class: 'modal-tlo', role: 'dialog', 'aria-modal': 'true' });
    const okno = ui.el('div', { class: 'modal' });

    if (opcje.tytul) okno.append(ui.el('h3', { class: 'modal-tytul' }, opcje.tytul));

    const tresc = ui.el('div', { class: 'modal-tresc' });
    if (typeof opcje.tresc === 'string') {
      for (const akapit of opcje.tresc.split('\n')) {
        tresc.append(ui.el('p', {}, akapit));
      }
    } else if (opcje.tresc) {
      tresc.append(opcje.tresc);
    }
    okno.append(tresc);

    function zamknij() {
      tlo.remove();
      document.removeEventListener('keydown', naEsc);
    }
    function naEsc(zd) {
      if (zd.key === 'Escape' && opcje.zamykalny !== false) zamknij();
    }

    const pasek = ui.el('div', { class: 'modal-przyciski' });
    const przyciski = opcje.przyciski || [{ tekst: 'Zamknij' }];
    for (const p of przyciski) {
      pasek.append(ui.el('button', {
        class: 'przycisk ' + (p.klasa || ''),
        onclick: () => { zamknij(); if (p.akcja) p.akcja(); },
      }, p.tekst));
    }
    okno.append(pasek);

    if (opcje.zamykalny !== false) {
      tlo.addEventListener('click', (zd) => { if (zd.target === tlo) zamknij(); });
      document.addEventListener('keydown', naEsc);
    }

    tlo.append(okno);
    document.body.append(tlo);
    const pierwszy = okno.querySelector('button, input');
    if (pierwszy) pierwszy.focus();
    return zamknij;
  };

  /* ---------- gotowe modale pomocnicze ---------- */

  ui.pokazEkwipunek = function () {
    const d = GRA.stan.dane;
    const lista = ui.el('div', { class: 'lista-ekwipunku' });
    if (!d || d.ekwipunek.length === 0) {
      lista.append(ui.el('p', { class: 'wyszarzone' },
        'Plecak jest pusty. Badaj miejsca w pokojach, aby znaleźć przedmioty.'));
    } else {
      for (const p of d.ekwipunek) {
        lista.append(ui.el('div', { class: 'przedmiot' },
          ui.el('span', { class: 'przedmiot-ikona' }, p.ikona),
          ui.el('div', {},
            ui.el('strong', {}, p.nazwa),
            ui.el('div', { class: 'przedmiot-opis' }, p.opis))));
      }
    }
    ui.modal({ tytul: '🎒 Ekwipunek', tresc: lista });
  };

  ui.pokazNotatnik = function () {
    const d = GRA.stan.dane;
    const lista = ui.el('div', {});
    if (!d || d.notatki.length === 0) {
      lista.append(ui.el('p', { class: 'wyszarzone' },
        'Notatnik jest pusty. Notatki historyczne zbierasz, rozwiązując zagadki ' +
        'i badając miejsca oznaczone jako wskazówki.'));
    } else {
      for (const n of d.notatki) {
        const wpis = ui.el('details', { class: 'notatka' },
          ui.el('summary', {}, n.tytul),
          ui.el('p', {}, n.tekst));
        lista.append(wpis);
      }
    }
    ui.modal({ tytul: '📖 Notatnik historyczny', tresc: lista });
  };

  ui.pokazTabeleMorse = function () {
    const tabela = ui.el('div', { class: 'morse-tabela' });
    for (const [litera, kod] of Object.entries(GRA.MORSE)) {
      tabela.append(ui.el('div', { class: 'morse-wiersz' },
        ui.el('strong', {}, litera), ui.el('span', { class: 'morse-kod' }, kod)));
    }
    ui.modal({ tytul: '📜 Alfabet Morse’a', tresc: tabela });
  };

  ui.pokazOsiagniecie = function (id) {
    const o = GRA.DANE.osiagniecia.find((x) => x.id === id);
    if (!o) return;
    GRA.dzwiek.osiagniecie();
    ui.toast(`${o.ikona} Osiągnięcie: ${o.nazwa}`, 'toast-osiagniecie');
  };

  GRA.ui = ui;
})();
