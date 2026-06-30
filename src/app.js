import './styles.css';
import {
  pustyDokument, nowaSekcja, noweUstalenie, noweZdjecie, noweZalecenieI,
  STANY_TECHNICZNE, STOPNIE_PILNOSCI, SZABLONY_SEKCJI,
  RODZAJE_KONSTRUKCJI, WYPOSAZENIE, STATUSY_WYKONANIA,
} from './constants.js';
import {
  wczytajDokument, zapiszDokument, zapiszZdjecie, wczytajZdjecie, usunZdjecie, sprzatnijZdjecia,
} from './storage.js';
import { przetworzObraz, obrazyZeSchowka } from './photos.js';
import { generujDocx, nazwaPliku } from './docx-export.js';
import { VoiceController, obslugiwane as glosWspierany } from './voice.js';

// ---------- Stan globalny ----------
let doc = pustyDokument();
let aktywnaSekcjaId = null;       // sekcja docelowa dla komend głosowych
let aktywnePole = null;           // ostatnio aktywne pole tekstowe (do dyktowania)
const urlCache = new Map();       // id zdjęcia -> object URL

const app = document.getElementById('app');

// ---------- Inicjalizacja ----------
async function init() {
  const zapisany = await wczytajDokument();
  if (zapisany) {
    const baza = pustyDokument();
    doc = { ...baza, ...zapisany, meta: { ...baza.meta, ...(zapisany.meta || {}) } };
    // Uzupełnij brakujące pola (zgodność ze starszymi zapisami)
    if (!Array.isArray(doc.rozdzialI)) doc.rozdzialI = [];
    if (!Array.isArray(doc.meta.rodzajKonstrukcji)) doc.meta.rodzajKonstrukcji = [];
    if (!Array.isArray(doc.meta.wyposazenie)) doc.meta.wyposazenie = [];
  }
  if (doc.sekcje.length) aktywnaSekcjaId = doc.sekcje[doc.sekcje.length - 1].id;
  render();
  podepnijZdarzeniaGlobalne();
}

// ---------- Zapis ----------
function zapisz(natychmiast = false) {
  zapiszDokument(doc, { natychmiast });
}
// Operacje strukturalne (dodaj/usuń) zapisujemy natychmiast — mniejsze ryzyko utraty danych.
function zapiszTeraz() { zapiszDokument(doc, { natychmiast: true }); }

// ---------- Głos ----------
const voice = new VoiceController({
  onStatus: (s) => odswiezPasekGlosu(s),
  onLog: (t) => pokazToast(t),
  onCommand: (cmd, arg) => obsluzKomende(cmd, arg),
  onDictation: (tekst) => dyktujDoPola(tekst),
});

function obsluzKomende(cmd, arg) {
  const sek = aktualnaSekcja();
  switch (cmd) {
    case 'nowaSekcja':
      dodajSekcje(arg || '');
      break;
    case 'noweUstalenie':
      if (sek) { dodajUstalenie(sek.id, arg || ''); } else pokazToast('Najpierw dodaj sekcję.');
      break;
    case 'pilnosc':
      if (sek && sek.ustalenia.length && arg) {
        sek.ustalenia[sek.ustalenia.length - 1].pilnosc = arg;
        zapisz(); render();
      } else pokazToast('Brak ustalenia do oznaczenia stopniem pilności.');
      break;
    case 'ocena':
      if (sek && arg) { sek.ogolnaOcena = arg; zapisz(); render(); pokazToast('Ocena: ' + arg); }
      break;
    case 'zdjecie':
      if (sek) wyborZdjecia(sek.id); else pokazToast('Najpierw dodaj sekcję.');
      break;
    case 'podpisZdjecia':
      if (sek && sek.zdjecia.length) {
        sek.zdjecia[sek.zdjecia.length - 1].opis = arg || '';
        zapisz(); render();
      } else pokazToast('Brak zdjęcia do opisania.');
      break;
    case 'dyktuj':
      if (!aktywnePole) { pokazToast('Kliknij najpierw pole, do którego dyktować.'); break; }
      voice.ustawDyktowanie(true);
      pokazToast('Dyktowanie włączone — powiedz „koniec”, aby zakończyć.');
      break;
    case 'koniecDyktowania':
      voice.ustawDyktowanie(false);
      pokazToast('Dyktowanie zakończone.');
      break;
    case 'nowyAkapit':
      if (aktywnePole) dyktujDoPola('\n');
      break;
    case 'wyczyscPole':
      if (aktywnePole) { aktywnePole.value = ''; aktywnePole.dispatchEvent(new Event('input', { bubbles: true })); }
      break;
    case 'zapisz':
      zapisz(true); pokazToast('Zapisano.');
      break;
    case 'eksport':
      eksportujDocx();
      break;
    default:
      break;
  }
}

function dyktujDoPola(tekst) {
  const el = aktywnePole;
  if (!el) { pokazToast('Brak aktywnego pola.'); return; }
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  el.value = el.value.slice(0, start) + tekst + el.value.slice(end);
  const pos = start + tekst.length;
  try { el.setSelectionRange(pos, pos); } catch (e) {}
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

// ---------- Operacje na modelu ----------
function aktualnaSekcja() {
  return doc.sekcje.find((s) => s.id === aktywnaSekcjaId) || doc.sekcje[doc.sekcje.length - 1] || null;
}

function dodajSekcje(title) {
  const s = nowaSekcja(title);
  doc.sekcje.push(s);
  aktywnaSekcjaId = s.id;
  zapiszTeraz(); render();
  ustawFokus(`[data-sec="${s.id}"][data-field="title"]`);
}

function usunSekcje(id) {
  const s = doc.sekcje.find((x) => x.id === id);
  if (s) for (const z of s.zdjecia) zwolnijUrl(z.id);
  doc.sekcje = doc.sekcje.filter((x) => x.id !== id);
  if (aktywnaSekcjaId === id) aktywnaSekcjaId = doc.sekcje.length ? doc.sekcje[doc.sekcje.length - 1].id : null;
  zapiszTeraz(); render();
  sprzatnijZdjecia(doc);
}

function dodajUstalenie(sekId, text) {
  const s = doc.sekcje.find((x) => x.id === sekId);
  if (!s) return;
  const u = noweUstalenie(text);
  s.ustalenia.push(u);
  zapiszTeraz(); render();
  ustawFokus(`[data-sec="${sekId}"][data-ust="${u.id}"][data-field="text"]`);
}

function usunUstalenie(sekId, ustId) {
  const s = doc.sekcje.find((x) => x.id === sekId);
  if (!s) return;
  s.ustalenia = s.ustalenia.filter((u) => u.id !== ustId);
  zapiszTeraz(); render();
}

async function wyborZdjecia(sekId) {
  aktywnaSekcjaId = sekId;
  const inp = document.getElementById('plik-zdjecie');
  inp.value = '';
  inp.click();
}

async function dodajZdjeciaZPlikow(sekId, pliki) {
  const s = doc.sekcje.find((x) => x.id === sekId);
  if (!s) { pokazToast('Najpierw dodaj sekcję.'); return; }
  let dodane = 0;
  for (const f of pliki) {
    if (!f.type || !f.type.startsWith('image/')) continue;
    try {
      const { blob, width, height } = await przetworzObraz(f);
      const z = noweZdjecie('');
      z.w = width; z.h = height;
      await zapiszZdjecie(z.id, blob);
      s.zdjecia.push(z);
      dodane++;
    } catch (e) {
      console.error(e);
      pokazToast('Nie udało się wczytać zdjęcia.');
    }
  }
  if (dodane) { zapiszTeraz(); render(); pokazToast(`Dodano zdjęć: ${dodane}`); }
}

async function usunZdjecieZSekcji(sekId, fotoId) {
  const s = doc.sekcje.find((x) => x.id === sekId);
  if (!s) return;
  s.zdjecia = s.zdjecia.filter((z) => z.id !== fotoId);
  zwolnijUrl(fotoId);
  await usunZdjecie(fotoId);
  zapiszTeraz(); render();
}

function dodajZalecenieI() {
  const z = noweZalecenieI('');
  doc.rozdzialI.push(z);
  zapiszTeraz(); render();
  ustawFokus(`[data-zal="${z.id}"][data-field="text"]`);
}
function usunZalecenieI(id) {
  doc.rozdzialI = doc.rozdzialI.filter((z) => z.id !== id);
  zapiszTeraz(); render();
}
function przelaczWybor(grupa, wartosc, zazn) {
  const pole = grupa === 'rodzaj' ? 'rodzajKonstrukcji' : 'wyposazenie';
  const arr = doc.meta[pole] || (doc.meta[pole] = []);
  const i = arr.indexOf(wartosc);
  if (zazn && i === -1) arr.push(wartosc);
  else if (!zazn && i !== -1) arr.splice(i, 1);
  zapiszTeraz();
}

function dodajInspektora() {
  doc.meta.inspektorzy.push({ imie: '', specjalnosc: '', uprawnienia: '' });
  zapiszTeraz(); render();
}
function usunInspektora(i) {
  doc.meta.inspektorzy.splice(i, 1);
  zapiszTeraz(); render();
}

// ---------- Eksport ----------
async function eksportujDocx() {
  pokazToast('Generuję dokument Word…');
  try {
    const blob = await generujDocx(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nazwaPliku(doc);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    pokazToast('Gotowe — pobrano protokół .docx');
  } catch (e) {
    console.error(e);
    pokazToast('Błąd generowania dokumentu: ' + e.message);
  }
}

// ---------- Object URL zdjęć ----------
function urlZdjecia(z) {
  if (urlCache.has(z.id)) return urlCache.get(z.id);
  // Tworzymy placeholder, a realny URL po wczytaniu blobu
  urlCache.set(z.id, '');
  wczytajZdjecie(z.id).then((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    urlCache.set(z.id, url);
    const img = document.querySelector(`img[data-foto-img="${z.id}"]`);
    if (img) img.src = url;
  });
  return '';
}
function zwolnijUrl(id) {
  const u = urlCache.get(id);
  if (u) URL.revokeObjectURL(u);
  urlCache.delete(id);
}

// ---------- RENDER ----------
function render() {
  app.innerHTML = `
    ${pasekGorny()}
    <main class="kontener">
      ${sekcjaMeta()}
      ${sekcjaRozdzialI()}
      ${sekcjaUstalen()}
      ${sekcjaPodsumowania()}
    </main>
    ${pasekGlosu(voice.stan())}
  `;
}

function pasekGorny() {
  return `
  <header class="topbar">
    <div class="topbar-title">📋 Protokoły kontroli</div>
    <div class="topbar-actions">
      <button data-action="zapisz" class="btn">💾 Zapisz</button>
      <button data-action="eksport" class="btn btn-primary">📄 Eksport Word</button>
      <button data-action="nowy" class="btn btn-ghost">🗑️ Nowy</button>
    </div>
  </header>`;
}

function pole(etykieta, attrs, wartosc, { textarea = false, rows = 2 } = {}) {
  const v = (wartosc ?? '').toString().replace(/"/g, '&quot;');
  const a = Object.entries(attrs).map(([k, val]) => `data-${k}="${val}"`).join(' ');
  if (textarea) {
    return `<label class="pole"><span>${etykieta}</span>
      <textarea ${a} rows="${rows}">${escapeHtml(wartosc ?? '')}</textarea></label>`;
  }
  return `<label class="pole"><span>${etykieta}</span>
    <input ${a} value="${v}" /></label>`;
}

function sekcjaMeta() {
  const m = doc.meta;
  const inspektorzy = m.inspektorzy.map((ins, i) => `
    <div class="insp-row">
      <input data-insp="${i}" data-field="imie" placeholder="Imię i nazwisko" value="${esc(ins.imie)}" />
      <input data-insp="${i}" data-field="specjalnosc" placeholder="Specjalność" value="${esc(ins.specjalnosc)}" />
      <input data-insp="${i}" data-field="uprawnienia" placeholder="Nr uprawnień / Izba" value="${esc(ins.uprawnienia)}" />
      <button class="btn-mini btn-del" data-action="usun-insp" data-i="${i}">✕</button>
    </div>`).join('');

  return `
  <details class="karta" open>
    <summary>🏢 Dane protokołu i obiektu</summary>
    <div class="grid2">
      ${pole('Numer protokołu', { meta: 'protokolNr' }, m.protokolNr)}
      ${pole('Branża', { meta: 'branza' }, m.branza)}
      ${pole('Rodzaj kontroli', { meta: 'rodzajKontroli' }, m.rodzajKontroli)}
      ${pole('Data kontroli', { meta: 'dataKontroli' }, m.dataKontroli)}
      ${pole('Data następnej kontroli', { meta: 'dataNastepnej' }, m.dataNastepnej)}
      ${pole('Nr ewidencyjny obiektu', { meta: 'nrEwidencyjny' }, m.nrEwidencyjny)}
    </div>
    ${pole('Adres obiektu', { meta: 'adres' }, m.adres, { textarea: true, rows: 2 })}
    ${pole('Nazwa obiektu / funkcja', { meta: 'nazwaObiektu' }, m.nazwaObiektu, { textarea: true, rows: 2 })}
    <div class="grid2">
      ${pole('Właściciel obiektu', { meta: 'wlasciciel' }, m.wlasciciel, { textarea: true, rows: 2 })}
      ${pole('Zarządca obiektu', { meta: 'zarzadca' }, m.zarzadca, { textarea: true, rows: 2 })}
    </div>
    <div class="grid3">
      ${pole('Kondygnacje nadziemne', { meta: 'liczbaKondygnacjiNad' }, m.liczbaKondygnacjiNad)}
      ${pole('Kondygnacje podziemne', { meta: 'liczbaKondygnacjiPod' }, m.liczbaKondygnacjiPod)}
      ${pole('Pozwolenie na użytkowanie', { meta: 'pozwolenieUzytkowanie' }, m.pozwolenieUzytkowanie)}
      ${pole('Powierzchnia zabudowy', { meta: 'powierzchniaZabudowy' }, m.powierzchniaZabudowy)}
      ${pole('Kubatura', { meta: 'kubatura' }, m.kubatura)}
    </div>
    <div class="podtytul">Rodzaj konstrukcji</div>
    ${grupaWyboru(RODZAJE_KONSTRUKCJI, m.rodzajKonstrukcji, 'rodzaj')}
    <div class="podtytul">Wyposażenie budynku</div>
    ${grupaWyboru(WYPOSAZENIE, m.wyposazenie, 'wyposazenie')}
    <div class="podtytul">Osoby wykonujące przegląd</div>
    ${inspektorzy}
    <button class="btn-mini" data-action="dodaj-insp">➕ Dodaj osobę</button>
  </details>`;
}

function grupaWyboru(opcje, zaznaczone, grupa) {
  const set = new Set(zaznaczone || []);
  const chips = opcje.map((o) => `
    <label class="chip ${set.has(o) ? 'on' : ''}">
      <input type="checkbox" data-chk="${grupa}" data-val="${esc(o)}" ${set.has(o) ? 'checked' : ''} />
      <span>${o}</span>
    </label>`).join('');
  return `<div class="chips">${chips}</div>`;
}

function sekcjaRozdzialI() {
  const m = doc.meta;
  const wiersze = doc.rozdzialI.map((z, i) => `
    <div class="zal-row">
      <span class="ust-lp">${i + 1}</span>
      <textarea data-zal="${z.id}" data-field="text" rows="2"
        placeholder="Zalecenie z poprzedniej kontroli…">${escapeHtml(z.text)}</textarea>
      <select data-zal="${z.id}" data-field="pilnosc" title="Stopień pilności">
        ${STOPNIE_PILNOSCI.map((sp) =>
    `<option value="${sp.value}" ${sp.value === z.pilnosc ? 'selected' : ''}>${sp.label}</option>`).join('')}
      </select>
      <select data-zal="${z.id}" data-field="status" title="Sprawdzenie wykonania">
        ${STATUSY_WYKONANIA.map((s) =>
    `<option value="${esc(s)}" ${s === z.status ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
      <button class="btn-mini btn-del" data-action="usun-zal" data-zal="${z.id}">✕</button>
    </div>`).join('');

  return `
  <div class="naglowek-rozdzialu">📋 ROZDZIAŁ I — Wykonanie zaleceń z poprzedniej kontroli</div>
  <details class="karta" ${doc.rozdzialI.length ? 'open' : ''}>
    <summary>Zalecenia z poprzedniego przeglądu (${doc.rozdzialI.length})</summary>
    ${pole('Informacja o poprzedniej kontroli (data, osoby)', { meta: 'poprzedniaKontrola' },
    m.poprzedniaKontrola, { textarea: true, rows: 2 })}
    <div class="zal-naglowek"><span>L.p.</span><span>Zalecenie z poprzedniej kontroli</span><span>Pilność</span><span>Wykonanie</span><span></span></div>
    ${wiersze || '<p class="pusto-mini">Brak zaleceń (np. pierwsza kontrola).</p>'}
    <button class="btn-mini" data-action="dodaj-zal">➕ Dodaj zalecenie</button>
  </details>`;
}

function sekcjaUstalen() {
  const sekcje = doc.sekcje.map((s) => kartaSekcji(s)).join('');
  const opcjeSzablon = SZABLONY_SEKCJI.map((t) => `<option value="${esc(t)}">`).join('');
  return `
  <div class="naglowek-rozdzialu">📌 ROZDZIAŁ II — Ustalenia i ocena stanu technicznego</div>
  ${sekcje || '<p class="pusto">Brak sekcji. Dodaj pierwszy obszar kontroli ↓</p>'}
  <div class="dodaj-sekcje">
    <input id="nowa-sekcja-nazwa" list="szablony-sekcji" placeholder="Nazwa obszaru (np. Elewacje i teren zewnętrzny)" />
    <datalist id="szablony-sekcji">${opcjeSzablon}</datalist>
    <button class="btn btn-primary" data-action="dodaj-sekcje">➕ Dodaj sekcję</button>
  </div>`;
}

function kartaSekcji(s) {
  const aktywna = s.id === aktywnaSekcjaId;
  const oceny = STANY_TECHNICZNE.map((o) =>
    `<option value="${o.value}" ${o.value === s.ogolnaOcena ? 'selected' : ''}>${o.value}</option>`).join('');

  const ustalenia = s.ustalenia.map((u, i) => `
    <div class="ust-row">
      <span class="ust-lp">${i + 1}</span>
      <textarea data-sec="${s.id}" data-ust="${u.id}" data-field="text" rows="2"
        placeholder="Opis stanu / usterki…">${escapeHtml(u.text)}</textarea>
      <select data-sec="${s.id}" data-ust="${u.id}" data-field="pilnosc" title="Stopień pilności">
        ${STOPNIE_PILNOSCI.map((sp) =>
    `<option value="${sp.value}" ${sp.value === u.pilnosc ? 'selected' : ''}>${sp.label}</option>`).join('')}
      </select>
      <button class="btn-mini btn-del" data-action="usun-ust" data-sec="${s.id}" data-ust="${u.id}">✕</button>
    </div>`).join('');

  const zdjecia = s.zdjecia.map((z) => `
    <figure class="foto">
      <img data-foto-img="${z.id}" src="${urlZdjecia(z) || ''}" alt="zdjęcie" loading="lazy" />
      <button class="foto-del" data-action="usun-foto" data-sec="${s.id}" data-foto="${z.id}">✕</button>
      <textarea class="foto-opis" data-sec="${s.id}" data-foto="${z.id}" data-field="opis"
        rows="2" placeholder="Podpis zdjęcia…">${escapeHtml(z.opis)}</textarea>
    </figure>`).join('');

  return `
  <section class="karta sekcja ${aktywna ? 'aktywna' : ''}" data-sec-card="${s.id}">
    <div class="sekcja-head">
      <input class="sekcja-title" data-sec="${s.id}" data-field="title"
        placeholder="Nazwa obszaru kontroli" value="${esc(s.title)}" />
      <label class="ocena-label">Ocena:
        <select data-sec="${s.id}" data-field="ogolnaOcena">${oceny}</select>
      </label>
      <button class="btn-mini btn-del" data-action="usun-sekcje" data-sec="${s.id}">🗑️</button>
    </div>

    <div class="ustalenia">
      <div class="ust-naglowek"><span>L.p.</span><span>Ustalenia / opis stanu technicznego</span><span>Pilność</span><span></span></div>
      ${ustalenia || '<p class="pusto-mini">Brak ustaleń.</p>'}
      <button class="btn-mini" data-action="dodaj-ust" data-sec="${s.id}">➕ Dodaj ustalenie</button>
    </div>

    <div class="zdjecia-head">
      <span>📷 Zdjęcia (${s.zdjecia.length})</span>
      <span class="zdj-akcje">
        <button class="btn-mini" data-action="aparat" data-sec="${s.id}">📸 Aparat</button>
        <button class="btn-mini" data-action="z-pliku" data-sec="${s.id}">🖼️ Z plików</button>
        <span class="hint">albo wklej (Ctrl+V) / przeciągnij tutaj</span>
      </span>
    </div>
    <div class="galeria" data-drop-sec="${s.id}">
      ${zdjecia || '<p class="pusto-mini">Brak zdjęć.</p>'}
    </div>
  </section>`;
}

function sekcjaPodsumowania() {
  return `
  <div class="naglowek-rozdzialu">📝 ROZDZIAŁ III — Zalecenia, podsumowanie i wnioski</div>
  <div class="karta">
    ${pole('Podsumowanie i wnioski (każdy akapit w nowej linii)', { meta: 'podsumowanie-pole', field: 'podsumowanie' },
    doc.podsumowanie, { textarea: true, rows: 8 })}
  </div>`;
}

function pasekGlosu(stan) {
  const wsparcie = glosWspierany();
  return `
  <div class="voicebar">
    <button id="btn-mic" class="mic ${stan.wlaczony ? 'on' : ''}" ${wsparcie ? '' : 'disabled'}
      title="${wsparcie ? 'Włącz/wyłącz mikrofon' : 'Brak wsparcia mowy — użyj Chrome'}">
      ${stan.wlaczony ? '🔴 Mikrofon WŁ.' : '🎤 Mikrofon'}
    </button>
    <button id="btn-dyktuj" class="mic-sub ${stan.dyktowanie ? 'on' : ''}" ${stan.wlaczony ? '' : 'disabled'}>
      ${stan.dyktowanie ? '✍️ Dyktowanie WŁ.' : '✍️ Dyktuj'}
    </button>
    <button id="btn-pomoc-glos" class="mic-sub">❓ Komendy</button>
  </div>`;
}

// ---------- Zdarzenia ----------
function podepnijZdarzeniaGlobalne() {
  // Kliknięcia (delegacja)
  app.addEventListener('click', onClick);
  // Edycja pól tekstowych/list (bez przerenderowania)
  app.addEventListener('input', onInput);
  app.addEventListener('change', onChange);
  // Śledzenie aktywnego pola do dyktowania
  app.addEventListener('focusin', (e) => {
    const el = e.target;
    if (el.matches('input[type="text"], input:not([type]), textarea')) {
      aktywnePole = el;
      const card = el.closest('[data-sec-card]');
      if (card) aktywnaSekcjaId = card.getAttribute('data-sec-card');
    }
  });
  // Wklejanie zdjęć ze schowka
  document.addEventListener('paste', (e) => {
    const obrazy = obrazyZeSchowka(e.clipboardData);
    if (obrazy.length) {
      e.preventDefault();
      const sek = aktualnaSekcja();
      if (sek) dodajZdjeciaZPlikow(sek.id, obrazy);
      else pokazToast('Najpierw dodaj sekcję, aby wkleić zdjęcie.');
    }
  });
  // Przeciąganie i upuszczanie zdjęć na galerię
  app.addEventListener('dragover', (e) => {
    if (e.target.closest('[data-drop-sec]')) { e.preventDefault(); }
  });
  app.addEventListener('drop', (e) => {
    const strefa = e.target.closest('[data-drop-sec]');
    if (!strefa) return;
    e.preventDefault();
    const sekId = strefa.getAttribute('data-drop-sec');
    const pliki = [...(e.dataTransfer?.files || [])];
    if (pliki.length) dodajZdjeciaZPlikow(sekId, pliki);
  });

  // Inputy plików
  document.getElementById('plik-zdjecie').addEventListener('change', (e) => {
    const sek = aktualnaSekcja();
    if (sek) dodajZdjeciaZPlikow(sek.id, [...e.target.files]);
  });

  // Zrzut zapisu przy ukryciu/zamknięciu strony — zabezpieczenie przed utratą danych
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') zapiszTeraz();
  });
  window.addEventListener('pagehide', () => zapiszTeraz());

  // Pasek głosu (poza #app — w body)
  document.body.addEventListener('click', (e) => {
    if (e.target.closest('#btn-mic')) voice.przelacz();
    else if (e.target.closest('#btn-dyktuj')) voice.ustawDyktowanie(!voice.stan().dyktowanie);
    else if (e.target.closest('#btn-pomoc-glos')) pokazPomocGlos();
  });
}

function onClick(e) {
  const b = e.target.closest('[data-action]');
  if (!b) return;
  const action = b.getAttribute('data-action');
  const sec = b.getAttribute('data-sec');
  switch (action) {
    case 'zapisz': zapisz(true); pokazToast('Zapisano.'); break;
    case 'eksport': eksportujDocx(); break;
    case 'nowy': nowyDokument(); break;
    case 'dodaj-sekcje': {
      const inp = document.getElementById('nowa-sekcja-nazwa');
      dodajSekcje(inp.value.trim());
      break;
    }
    case 'usun-sekcje': if (confirm('Usunąć całą sekcję wraz ze zdjęciami?')) usunSekcje(sec); break;
    case 'dodaj-ust': dodajUstalenie(sec, ''); break;
    case 'usun-ust': usunUstalenie(sec, b.getAttribute('data-ust')); break;
    case 'aparat':
      aktywnaSekcjaId = sec;
      { const inp = document.getElementById('plik-aparat'); inp.value = ''; inp.onchange = (ev) => dodajZdjeciaZPlikow(sec, [...ev.target.files]); inp.click(); }
      break;
    case 'z-pliku': wyborZdjecia(sec); break;
    case 'usun-foto': usunZdjecieZSekcji(sec, b.getAttribute('data-foto')); break;
    case 'dodaj-insp': dodajInspektora(); break;
    case 'usun-insp': usunInspektora(parseInt(b.getAttribute('data-i'), 10)); break;
    case 'dodaj-zal': dodajZalecenieI(); break;
    case 'usun-zal': usunZalecenieI(b.getAttribute('data-zal')); break;
    default: break;
  }
}

function onInput(e) {
  const el = e.target;
  // Meta proste
  const meta = el.getAttribute('data-meta');
  if (meta === 'podsumowanie-pole') { doc.podsumowanie = el.value; zapisz(); return; }
  if (meta) { doc.meta[meta] = el.value; zapisz(); return; }
  // Inspektorzy
  const insp = el.getAttribute('data-insp');
  if (insp !== null) {
    const i = parseInt(insp, 10);
    doc.meta.inspektorzy[i][el.getAttribute('data-field')] = el.value;
    zapisz(); return;
  }
  // Rozdział I — zalecenia z poprzedniej kontroli (tekst)
  const zal = el.getAttribute('data-zal');
  if (zal && el.getAttribute('data-field') === 'text') {
    const z = doc.rozdzialI.find((x) => x.id === zal);
    if (z) z.text = el.value;
    zapisz(); return;
  }
  // Sekcje / ustalenia / zdjęcia
  const sec = el.getAttribute('data-sec');
  if (sec) {
    const s = doc.sekcje.find((x) => x.id === sec);
    if (!s) return;
    const field = el.getAttribute('data-field');
    const ust = el.getAttribute('data-ust');
    const foto = el.getAttribute('data-foto');
    if (ust) {
      const u = s.ustalenia.find((x) => x.id === ust);
      if (u && field === 'text') u.text = el.value;
    } else if (foto) {
      const z = s.zdjecia.find((x) => x.id === foto);
      if (z && field === 'opis') z.opis = el.value;
    } else if (field === 'title') {
      s.title = el.value;
    }
    zapisz();
  }
}

function onChange(e) {
  const el = e.target;
  // Checkboxy: rodzaj konstrukcji / wyposażenie
  const chk = el.getAttribute('data-chk');
  if (chk) {
    przelaczWybor(chk, el.getAttribute('data-val'), el.checked);
    el.closest('.chip')?.classList.toggle('on', el.checked);
    return;
  }
  // Rozdział I — selecty (pilność, status)
  const zal = el.getAttribute('data-zal');
  if (zal) {
    const z = doc.rozdzialI.find((x) => x.id === zal);
    if (z) {
      const f = el.getAttribute('data-field');
      if (f === 'pilnosc') z.pilnosc = parseInt(el.value, 10);
      else if (f === 'status') z.status = el.value;
    }
    zapisz(); return;
  }
  if (el.tagName !== 'SELECT') return;
  const sec = el.getAttribute('data-sec');
  if (!sec) return;
  const s = doc.sekcje.find((x) => x.id === sec);
  if (!s) return;
  const field = el.getAttribute('data-field');
  const ust = el.getAttribute('data-ust');
  if (ust && field === 'pilnosc') {
    const u = s.ustalenia.find((x) => x.id === ust);
    if (u) u.pilnosc = parseInt(el.value, 10);
  } else if (field === 'ogolnaOcena') {
    s.ogolnaOcena = el.value;
  }
  zapisz();
}

function nowyDokument() {
  if (!confirm('Rozpocząć nowy protokół? Bieżące dane zostaną usunięte.')) return;
  for (const s of doc.sekcje) for (const z of s.zdjecia) zwolnijUrl(z.id);
  doc = pustyDokument();
  aktywnaSekcjaId = null;
  zapisz(true);
  sprzatnijZdjecia(doc);
  render();
}

// ---------- Pomocnicze UI ----------
let toastTimer = null;
function pokazToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

function odswiezPasekGlosu(stan) {
  const mic = document.getElementById('btn-mic');
  const dyk = document.getElementById('btn-dyktuj');
  if (mic) {
    mic.classList.toggle('on', stan.wlaczony);
    mic.textContent = stan.wlaczony ? '🔴 Mikrofon WŁ.' : '🎤 Mikrofon';
  }
  if (dyk) {
    dyk.classList.toggle('on', stan.dyktowanie);
    dyk.disabled = !stan.wlaczony;
    dyk.textContent = stan.dyktowanie ? '✍️ Dyktowanie WŁ.' : '✍️ Dyktuj';
  }
}

function ustawFokus(selektor) {
  requestAnimationFrame(() => {
    const el = app.querySelector(selektor);
    if (el) { el.focus(); aktywnePole = el; }
  });
}

function pokazPomocGlos() {
  alert([
    'KOMENDY GŁOSOWE (po polsku):',
    '• „nowa sekcja [nazwa]” — dodaj obszar kontroli',
    '• „nowe ustalenie / nowa usterka [opis]” — dodaj wiersz ustaleń',
    '• „stopień pilności jeden/dwa/trzy/cztery” — ustaw pilność ostatniego ustalenia',
    '• „ocena dobry/zadowalający/dostateczny/zły/awaryjny” — ocena sekcji',
    '• „wstaw zdjęcie” — otwórz aparat / wybór pliku',
    '• „podpis [tekst]” — podpis ostatniego zdjęcia',
    '• „dyktuj” → mów → „koniec” — dyktowanie do zaznaczonego pola',
    '• „nowy akapit”, „wyczyść pole”',
    '• „zapisz”, „eksportuj” — zapis i generowanie protokołu Word',
    '',
    'Wskazówka: najlepiej działa w przeglądarce Chrome.',
  ].join('\n'));
}

// ---------- Util ----------
function esc(s) { return (s ?? '').toString().replace(/"/g, '&quot;'); }
function escapeHtml(s) {
  return (s ?? '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

init();
