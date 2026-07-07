import './styles.css';
import {
  pustyDokument, nowaSekcja, noweUstalenie, noweZdjecie, noweZalecenieI,
  STANY_TECHNICZNE, STOPNIE_PILNOSCI, SZABLONY_SEKCJI, DOMYSLNE_SEKCJE, PODPOWIEDZI_SEKCJI,
  RODZAJE_KONSTRUKCJI, WYPOSAZENIE, STATUSY_WYKONANIA, OSOBY_PRZEGLAD, RODZAJE_KONTROLI,
  wchodziDoZalecen, etykietaPilnosci,
} from './constants.js';
import {
  listaProjektow, wczytajProjekt, zapiszProjekt, usunProjekt, migrujStaryDokument,
  zapiszZdjecie, wczytajZdjecie, usunZdjecie, sprzatnijZdjecia,
} from './storage.js';
import { uid } from './constants.js';
import { przetworzObraz, obrazyZeSchowka } from './photos.js';
import { generujDocx, nazwaPliku } from './docx-export.js';
import { VoiceController, obslugiwane as glosWspierany } from './voice.js';
import * as cloud from './cloud.js';
import * as supa from './supa.js';

// ---------- Stan globalny ----------
let doc = null;                   // aktywny projekt (null = ekran wyboru)
let aktywnaSekcjaId = null;       // sekcja docelowa dla komend głosowych
let aktywneUstId = null;          // ustalenie docelowe (do wstawiania zdjęć)
let aktywnePole = null;           // ostatnio aktywne pole tekstowe (do dyktowania)
const urlCache = new Map();       // id zdjęcia -> object URL

const app = document.getElementById('app');

// ---------- Inicjalizacja ----------
async function init() {
  podepnijZdarzeniaGlobalne();
  await migrujStaryDokument(uid, nazwaProjektu);
  await supa.init();
  supa.onZmiana(() => { odswiezPrzyciskChmura(); });
  await pokazWybor();
}

// Uzupełnia brakujące pola (zgodność ze starszymi zapisami / z chmury).
function normalizuj(zap) {
  const baza = pustyDokument();
  const d = { ...baza, ...zap, meta: { ...baza.meta, ...(zap.meta || {}) } };
  if (!d.id) d.id = uid();
  if (!Array.isArray(d.rozdzialI)) d.rozdzialI = [];
  if (!Array.isArray(d.meta.rodzajKonstrukcji)) d.meta.rodzajKonstrukcji = [];
  if (!Array.isArray(d.meta.wyposazenie)) d.meta.wyposazenie = [];
  if (!Array.isArray(d.meta.wyposazenieDodatkowe)) d.meta.wyposazenieDodatkowe = [];
  if (d.meta.zdjecieGlowne === undefined) d.meta.zdjecieGlowne = null;
  for (const s of (d.sekcje || [])) {
    if (!Array.isArray(s.zdjecia)) s.zdjecia = [];
    for (const u of (s.ustalenia || [])) {
      if (!Array.isArray(u.zdjecia)) u.zdjecia = [];
      if (typeof u.element !== 'string') u.element = '';
      if (typeof u.ocena !== 'string') u.ocena = s.ogolnaOcena || 'Dobry'; // przejmij dawną ocenę sekcji
      u.pilnosc = String(u.pilnosc ?? '0');   // dawniej liczba
      // Zdjęcie dziedziczy stan techniczny podrozdziału, dopóki nie ustawiono własnego.
      for (const z of u.zdjecia) if (typeof z.ocena !== 'string' || z.ocena === '') z.ocena = u.ocena || 'Dobry';
    }
    for (const z of s.zdjecia) if (typeof z.ocena !== 'string') z.ocena = '';
  }
  for (const z of (d.rozdzialI || [])) z.pilnosc = String(z.pilnosc ?? '0');
  return d;
}

// Ekran wyboru projektu (pokazywany po każdym wejściu do aplikacji).
async function pokazWybor() {
  doc = null; aktywnaSekcjaId = null; aktywneUstId = null;
  const lokalne = await listaProjektow();
  const mapa = new Map();
  for (const p of lokalne) mapa.set(p.id, { ...p, zChmury: false });
  if (supa.zalogowany()) {
    try {
      const chmura = await supa.listaProjektow();
      for (const p of chmura) {
        const ist = mapa.get(p.id);
        mapa.set(p.id, { ...p, zChmury: true, lokalnie: !!ist });
      }
    } catch (e) { pokazToast('Nie udało się pobrać listy z chmury: ' + e.message); }
  }
  const scalone = [...mapa.values()].sort((a, b) =>
    (new Date(b.zmodyfikowano || 0)) - (new Date(a.zmodyfikowano || 0)));
  app.innerHTML = ekranWyboruHTML(scalone);
}

function ekranWyboruHTML(projekty) {
  const lista = projekty.map((p) => `
    <div class="proj-row">
      <button class="proj-open" data-action="otworz-projekt" data-id="${esc(p.id)}">
        <span class="proj-nazwa">🏢 ${esc(p.nazwa || 'Bez nazwy')} ${p.zChmury ? '<span class="proj-chmura">☁️</span>' : ''}</span>
        <span class="proj-meta">${esc(p.protokolNr ? 'Protokół ' + p.protokolNr + ' · ' : '')}${p.zmodyfikowano ? new Date(p.zmodyfikowano).toLocaleString('pl-PL') : ''}</span>
      </button>
      <button class="btn-mini btn-del" data-action="usun-projekt" data-id="${esc(p.id)}" title="Usuń projekt">🗑️</button>
    </div>`).join('');
  return `
  <header class="topbar">
    <div class="topbar-title">📋 Protokoły kontroli</div>
    <div class="topbar-actions">
      <button data-action="chmura" class="btn">${supa.status().zalogowany ? '☁️ Chmura ✓' : '☁️ Chmura'}</button>
    </div>
  </header>
  <main class="kontener wybor">
    <div class="wybor-hero">
      <h2>Wybierz, na czym chcesz pracować</h2>
      <button class="btn btn-primary btn-duzy" data-action="nowy-projekt">➕ Nowy protokół</button>
    </div>
    <div class="podtytul">Zapisane protokoły (${projekty.length})</div>
    ${lista || '<p class="pusto">Brak zapisanych protokołów. Utwórz pierwszy przyciskiem „Nowy protokół”.</p>'}
  </main>`;
}

async function otworzProjekt(id) {
  let zap = await wczytajProjekt(id);
  if (!zap && supa.zalogowany()) {
    pokazToast('Pobieranie projektu z chmury…');
    try {
      zap = await supa.wczytajProjekt(id, { onPostep: (t) => pokazToast(t) });
      if (zap) await zapiszProjekt(normalizuj(zap), { natychmiast: true }); // zapisz lokalnie jako kopię
    } catch (e) { pokazToast('Błąd pobierania z chmury: ' + e.message); }
  }
  if (!zap) { pokazToast('Nie znaleziono projektu.'); return; }
  doc = normalizuj(zap);
  aktywnaSekcjaId = doc.sekcje.length ? doc.sekcje[doc.sekcje.length - 1].id : null;
  aktywneUstId = null;
  render();
}

function nowyProjekt() {
  doc = pustyDokument();
  // Wstaw domyślny zestaw sekcji (obszarów kontroli) — edytowalny i usuwalny
  for (const nazwa of DOMYSLNE_SEKCJE) doc.sekcje.push(nowaSekcja(nazwa, nazwa));
  aktywnaSekcjaId = doc.sekcje.length ? doc.sekcje[0].id : null;
  aktywneUstId = null;
  zapiszTeraz();
  render();
  ustawFokus('[data-meta="protokolNr"]');
}

// Dodaje brakujące sekcje ze standardowego zestawu (bez duplikatów).
function wstawStandardoweSekcje() {
  const istniejace = new Set(doc.sekcje.map((s) => (s.title || '').trim().toLowerCase()));
  let dodane = 0;
  for (const nazwa of DOMYSLNE_SEKCJE) {
    if (!istniejace.has(nazwa.trim().toLowerCase())) { doc.sekcje.push(nowaSekcja(nazwa, nazwa)); dodane++; }
  }
  if (dodane) { aktywnaSekcjaId = doc.sekcje[doc.sekcje.length - 1].id; zapiszTeraz(); render(); pokazToast(`Dodano sekcji: ${dodane}`); }
  else pokazToast('Wszystkie standardowe sekcje już są.');
}

async function usunProjektZListy(id) {
  if (!confirm('Usunąć ten protokół wraz ze zdjęciami? Tej operacji nie można cofnąć.')) return;
  await usunProjekt(id);
  if (supa.zalogowany()) { try { await supa.usunProjekt(id); } catch (e) {} }
  await pokazWybor();
  pokazToast('Protokół usunięty.');
}

// ---------- Zapis ----------
function zapisz(natychmiast = false) {
  if (!doc || !doc.id) return;
  doc.nazwa = nazwaProjektu(doc);
  zapiszProjekt(doc, { natychmiast });
  zaplanujSupa();
}

// Jednorazowe wysłanie wszystkich lokalnych projektów do chmury (po zalogowaniu).
async function wyslijLokalneDoChmury() {
  if (!supa.zalogowany()) return;
  const lokalne = await listaProjektow();
  if (!lokalne.length) return;
  let n = 0;
  for (const p of lokalne) {
    try {
      const d = await wczytajProjekt(p.id);
      if (d) { await supa.zapiszProjekt(normalizuj(d)); n += 1; pokazToast(`Wysyłanie projektów do chmury: ${n}/${lokalne.length}…`); }
    } catch (e) { console.warn('Wysyłanie do chmury:', p.id, e); }
  }
  if (n) pokazToast(`Twoje projekty są w chmurze: ${n} ✓`);
}

let supaTimer = null;
function zaplanujSupa() {
  if (!supa.zalogowany() || !doc) return;
  if (supaTimer) clearTimeout(supaTimer);
  const snapshot = doc;
  supaTimer = setTimeout(() => {
    supa.zapiszProjekt(snapshot).then(() => odswiezPrzyciskChmura())
      .catch((e) => console.warn('Sync Supabase:', e));
  }, 3000);
}
// Operacje strukturalne (dodaj/usuń) zapisujemy natychmiast — mniejsze ryzyko utraty danych.
function zapiszTeraz() { zapisz(true); }

// Nazwa projektu wyprowadzona z adresu (ulicy) — do listy wyboru.
function nazwaProjektu(d) {
  const a = (d.meta?.adres || '').trim();
  if (a) {
    const m = a.match(/(ul\.|al\.|pl\.|os\.)\s*[^,\n]+/i);
    if (m) return m[0].trim();
    return (a.split(',').pop() || a).trim();
  }
  return d.meta?.protokolNr ? ('Protokół ' + d.meta.protokolNr) : 'Nowy protokół';
}

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
        sek.ustalenia[sek.ustalenia.length - 1].pilnosc = String(arg);
        zapisz(); render();
      } else pokazToast('Brak ustalenia do oznaczenia stopniem pilności.');
      break;
    case 'ocena':
      if (sek && arg && sek.ustalenia.length) {
        let uid2 = (aktywneUstId && sek.ustalenia.some((u) => u.id === aktywneUstId)) ? aktywneUstId : sek.ustalenia[sek.ustalenia.length - 1].id;
        const u = sek.ustalenia.find((x) => x.id === uid2);
        if (u) { u.ocena = arg; zapisz(); render(); pokazToast('Ocena: ' + arg); }
      } else pokazToast('Najpierw dodaj ustalenie, aby nadać ocenę.');
      break;
    case 'zdjecie': {
      if (!sek) { pokazToast('Najpierw dodaj sekcję.'); break; }
      // Cel: aktywne ustalenie -> ostatnie ustalenie -> ogólne sekcji
      let ustId = (aktywneUstId && sek.ustalenia.some((u) => u.id === aktywneUstId)) ? aktywneUstId : null;
      if (!ustId && sek.ustalenia.length) ustId = sek.ustalenia[sek.ustalenia.length - 1].id;
      otworzWyborZdjecia(sek.id, ustId);
      break;
    }
    case 'podpisZdjecia': {
      if (!sek) { pokazToast('Najpierw dodaj sekcję.'); break; }
      let ustId = (aktywneUstId && sek.ustalenia.some((u) => u.id === aktywneUstId)) ? aktywneUstId : null;
      if (!ustId && sek.ustalenia.length) ustId = sek.ustalenia[sek.ustalenia.length - 1].id;
      const arr = tablicaZdjec(sek.id, ustId) || sek.zdjecia;
      if (arr && arr.length) { arr[arr.length - 1].opis = arg || ''; zapisz(); render(); }
      else pokazToast('Brak zdjęcia do opisania.');
      break;
    }
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
function indeksSekcji(id) { return doc.sekcje.findIndex((s) => s.id === id); }

function dodajSekcje(title) {
  const s = nowaSekcja(title);
  doc.sekcje.push(s);
  aktywnaSekcjaId = s.id;
  zapiszTeraz(); render();
  ustawFokus(`[data-sec="${s.id}"][data-field="title"]`);
}

function usunSekcje(id) {
  const s = doc.sekcje.find((x) => x.id === id);
  if (s) {
    for (const z of (s.zdjecia || [])) zwolnijUrl(z.id);
    for (const u of (s.ustalenia || [])) for (const z of (u.zdjecia || [])) zwolnijUrl(z.id);
  }
  doc.sekcje = doc.sekcje.filter((x) => x.id !== id);
  if (aktywnaSekcjaId === id) aktywnaSekcjaId = doc.sekcje.length ? doc.sekcje[doc.sekcje.length - 1].id : null;
  zapiszTeraz(); render();
  sprzatnijZdjecia();
}

function dodajUstalenie(sekId, text, element = '') {
  const s = doc.sekcje.find((x) => x.id === sekId);
  if (!s) return;
  const u = noweUstalenie(text, element);
  s.ustalenia.push(u);
  zapiszTeraz(); render();
  // Ustaw kursor: gdy dodano z listy (jest element) — w opisie; inaczej w elemencie
  ustawFokus(`[data-sec="${sekId}"][data-ust="${u.id}"][data-field="${element ? 'text' : 'element'}"]`);
}

function usunUstalenie(sekId, ustId) {
  const s = doc.sekcje.find((x) => x.id === sekId);
  if (!s) return;
  const u = s.ustalenia.find((x) => x.id === ustId);
  if (u) for (const z of (u.zdjecia || [])) { zwolnijUrl(z.id); usunZdjecie(z.id); }
  s.ustalenia = s.ustalenia.filter((x) => x.id !== ustId);
  zapiszTeraz(); render();
  sprzatnijZdjecia();
}

// Przesuwanie pozycji (ręczna zmiana kolejności). kierunek: -1 w górę, +1 w dół.
function przesunWTablicy(arr, id, kierunek) {
  const i = arr.findIndex((x) => x.id === id);
  if (i === -1) return false;
  const j = i + kierunek;
  if (j < 0 || j >= arr.length) return false;
  const [el] = arr.splice(i, 1);
  arr.splice(j, 0, el);
  return true;
}
function przesunUstalenie(sekId, ustId, kierunek) {
  const s = doc.sekcje.find((x) => x.id === sekId);
  if (!s) return;
  if (przesunWTablicy(s.ustalenia, ustId, kierunek)) { zapiszTeraz(); render(); }
}
function przesunSekcje(sekId, kierunek) {
  if (przesunWTablicy(doc.sekcje, sekId, kierunek)) { zapiszTeraz(); render(); }
}
function przesunZalecenieI(id, kierunek) {
  if (przesunWTablicy(doc.rozdzialI, id, kierunek)) { zapiszTeraz(); render(); }
}

// Cel ostatnio wybranego wstawiania zdjęcia (sekcja lub ustalenie)
let celZdjecia = { sekId: null, ustId: null };

// Zwraca tablicę zdjęć dla celu: ustalenie (gdy ustId) lub ogólne sekcji.
function tablicaZdjec(sekId, ustId) {
  const s = doc.sekcje.find((x) => x.id === sekId);
  if (!s) return null;
  if (ustId) {
    const u = s.ustalenia.find((x) => x.id === ustId);
    if (!u) return null;
    if (!Array.isArray(u.zdjecia)) u.zdjecia = [];
    return u.zdjecia;
  }
  return s.zdjecia;
}

function otworzWyborZdjecia(sekId, ustId, aparat = false) {
  aktywnaSekcjaId = sekId;
  celZdjecia = { sekId, ustId: ustId || null };
  const inp = document.getElementById(aparat ? 'plik-aparat' : 'plik-zdjecie');
  inp.value = '';
  if (aparat) inp.onchange = (ev) => dodajZdjecia(sekId, ustId || null, [...ev.target.files]);
  inp.click();
}

// Stan techniczny (ocena) podrozdziału-ustalenia — do dziedziczenia przez zdjęcia.
function ocenaUstalenia(sekId, ustId) {
  if (!ustId) return '';
  const s = doc.sekcje.find((x) => x.id === sekId);
  const u = s && s.ustalenia.find((x) => x.id === ustId);
  return (u && u.ocena) || '';
}

async function dodajZdjecia(sekId, ustId, pliki) {
  const arr = tablicaZdjec(sekId, ustId);
  if (!arr) { pokazToast('Najpierw dodaj sekcję / ustalenie.'); return; }
  const domyslnaOcena = ocenaUstalenia(sekId, ustId);
  let dodane = 0;
  for (const f of pliki) {
    if (!f.type || !f.type.startsWith('image/')) continue;
    try {
      const { blob, width, height } = await przetworzObraz(f);
      const z = noweZdjecie('', domyslnaOcena);
      z.w = width; z.h = height;
      await zapiszZdjecie(z.id, blob);
      arr.push(z);
      dodane++;
    } catch (e) {
      console.error(e);
      pokazToast('Nie udało się wczytać zdjęcia.');
    }
  }
  if (dodane) { zapiszTeraz(); render(); pokazToast(`Dodano zdjęć: ${dodane}`); }
}

function otworzWyborGlowne(aparat = false) {
  celZdjecia = { glowne: true };
  const inp = document.getElementById(aparat ? 'plik-aparat' : 'plik-zdjecie');
  inp.value = '';
  if (aparat) inp.onchange = (ev) => dodajZdjecieGlowne([...ev.target.files]);
  inp.click();
}

async function dodajZdjecieGlowne(pliki) {
  const f = (pliki || []).find((x) => x.type && x.type.startsWith('image/'));
  if (!f) return;
  try {
    const { blob, width, height } = await przetworzObraz(f);
    // usuń poprzednie zdjęcie główne (jeśli było)
    if (doc.meta.zdjecieGlowne) { zwolnijUrl(doc.meta.zdjecieGlowne.id); await usunZdjecie(doc.meta.zdjecieGlowne.id); }
    const z = noweZdjecie('');
    z.w = width; z.h = height;
    await zapiszZdjecie(z.id, blob);
    doc.meta.zdjecieGlowne = { id: z.id, w: width, h: height };
    zapiszTeraz(); render();
    pokazToast('Dodano zdjęcie główne.');
  } catch (e) { console.error(e); pokazToast('Nie udało się wczytać zdjęcia.'); }
}

async function usunZdjecieGlowne() {
  const zg = doc.meta.zdjecieGlowne;
  if (!zg) return;
  zwolnijUrl(zg.id);
  await usunZdjecie(zg.id);
  doc.meta.zdjecieGlowne = null;
  zapiszTeraz(); render();
}

async function usunZdjecieZCelu(sekId, ustId, fotoId) {
  const arr = tablicaZdjec(sekId, ustId);
  if (!arr) return;
  const i = arr.findIndex((z) => z.id === fotoId);
  if (i !== -1) arr.splice(i, 1);
  zwolnijUrl(fotoId);
  await usunZdjecie(fotoId);
  zapiszTeraz(); render();
}

// Zdjęcie wskazane do przeniesienia (otwiera okno wyboru miejsca docelowego).
let przenoszone = null; // { sekId, ustId, fotoId } albo null

// Przenosi zdjęcie z jednego miejsca do innego (między sekcjami / pozycjami).
function przeniesZdjecie(srcSekId, srcUstId, fotoId, cel) {
  const zrodlo = tablicaZdjec(srcSekId, srcUstId || null);
  if (!zrodlo) return;
  let docelowa = null;
  if (cel.startsWith('ust:')) {
    const cz = cel.split(':');
    docelowa = tablicaZdjec(cz[1], cz[2]);
  } else if (cel.startsWith('sek:')) {
    docelowa = tablicaZdjec(cel.slice(4), null);
  }
  if (!docelowa || docelowa === zrodlo) { render(); return; }
  const i = zrodlo.findIndex((z) => z.id === fotoId);
  if (i === -1) return;
  const [z] = zrodlo.splice(i, 1);
  docelowa.push(z);
  zapiszTeraz(); render();
  pokazToast('Przeniesiono zdjęcie.');
}

// Zmiana kolejności zdjęć w obrębie tej samej galerii (podrozdziału / sekcji).
function przesunZdjecieWGalerii(sekId, ustId, fotoId, kierunek) {
  const arr = tablicaZdjec(sekId, ustId || null);
  if (arr && przesunWTablicy(arr, fotoId, kierunek)) { zapiszTeraz(); render(); }
}

// Okno wyboru miejsca docelowego dla zdjęcia (rozdziały = sekcje, podrozdziały = pozycje).
function modalPrzenoszenia() {
  if (!przenoszone) return '';
  const aktualnyCel = przenoszone.ustId
    ? `ust:${przenoszone.sekId}:${przenoszone.ustId}` : `sek:${przenoszone.sekId}`;
  const grupy = doc.sekcje.map((s, si) => {
    const st = ((s.title || '').trim()) || `Sekcja ${si + 1}`;
    const ogolneVal = `sek:${s.id}`;
    const znacznik = (v) => (v === aktualnyCel ? ' <span class="cel-tu">✓ tu jest</span>' : '');
    const pozycje = (s.ustalenia || []).map((u, ui) => {
      let et = ((u.element || u.text || '').trim()) || `Pozycja ${ui + 1}`;
      if (et.length > 70) et = et.slice(0, 70) + '…';
      const val = `ust:${s.id}:${u.id}`;
      return `<button class="cel-poz ${val === aktualnyCel ? 'aktualny' : ''}" data-action="przenies-do" data-cel="${esc(val)}">↳ ${escapeHtml(et)}${znacznik(val)}</button>`;
    }).join('');
    return `<div class="cel-grupa">
      <div class="cel-naglowek">📌 ${escapeHtml(st)}</div>
      <button class="cel-poz cel-ogolne ${ogolneVal === aktualnyCel ? 'aktualny' : ''}" data-action="przenies-do" data-cel="${esc(ogolneVal)}">Zdjęcia ogólne sekcji${znacznik(ogolneVal)}</button>
      ${pozycje}
    </div>`;
  }).join('');
  return `
  <div class="przenies-tlo">
    <div class="przenies-okno" role="dialog" aria-label="Przenieś zdjęcie">
      <div class="przenies-head">
        <span>↪ Przenieś zdjęcie do…</span>
        <button class="btn-mini" data-action="zamknij-przenies">✕</button>
      </div>
      <div class="przenies-body">${grupy || '<p class="pusto-mini">Brak innych miejsc.</p>'}</div>
    </div>
  </div>`;
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
function dodajWyposazenieOpcja(tekst) {
  const v = (tekst || '').trim();
  if (!v) { pokazToast('Wpisz nazwę pozycji.'); return; }
  if (!Array.isArray(doc.meta.wyposazenieDodatkowe)) doc.meta.wyposazenieDodatkowe = [];
  const juzJest = WYPOSAZENIE.includes(v) || doc.meta.wyposazenieDodatkowe.includes(v);
  if (!juzJest) doc.meta.wyposazenieDodatkowe.push(v);
  if (!doc.meta.wyposazenie.includes(v)) doc.meta.wyposazenie.push(v); // od razu zaznacz
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
function dodajInspektoraZListy(i) {
  const o = OSOBY_PRZEGLAD[i];
  if (!o) return;
  doc.meta.inspektorzy.push({ imie: o.imie, specjalnosc: o.specjalnosc, uprawnienia: o.uprawnienia });
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
    ${modalPrzenoszenia()}
  `;
}

function pasekGorny() {
  return `
  <header class="topbar">
    <div class="topbar-title">📋 Protokoły kontroli</div>
    <div class="topbar-actions">
      <button data-action="zapisz" class="btn">💾 Zapisz</button>
      <button data-action="eksport" class="btn btn-primary">📄 Eksport Word</button>
      <button data-action="chmura" class="btn">${supa.status().zalogowany ? '☁️ Chmura ✓' : '☁️ Chmura'}</button>
      <button data-action="projekty" class="btn btn-ghost">📂 Projekty</button>
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
      <label class="pole"><span>Rodzaj kontroli (częstotliwość)</span>
        <select data-meta-select="rodzajKontroli">
          ${RODZAJE_KONTROLI.concat(RODZAJE_KONTROLI.includes(m.rodzajKontroli) ? [] : [m.rodzajKontroli].filter(Boolean))
    .map((o) => `<option value="${esc(o)}" ${o === m.rodzajKontroli ? 'selected' : ''}>${esc(o)}</option>`).join('')}
        </select>
      </label>
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
    <div class="podtytul">Zdjęcie główne obiektu (na 1. stronie protokołu)</div>
    <div class="glowne-box">
      <div class="glowne-akcje">
        <button class="btn-mini" data-action="glowne-aparat">📸 Aparat</button>
        <button class="btn-mini" data-action="glowne-plik">🖼️ Z plików</button>
        ${m.zdjecieGlowne ? '<button class="btn-mini btn-del" data-action="usun-glowne">✕ Usuń zdjęcie</button>' : ''}
        <span class="hint">albo przeciągnij tutaj plik</span>
      </div>
      <div class="glowne-podglad" data-drop-glowne="1">
        ${m.zdjecieGlowne
    ? `<img data-foto-img="${m.zdjecieGlowne.id}" src="${urlZdjecia(m.zdjecieGlowne) || ''}" alt="zdjęcie główne" />`
    : '<span class="pusto-mini">Brak zdjęcia głównego.</span>'}
      </div>
    </div>

    <div class="podtytul">Rodzaj konstrukcji</div>
    ${grupaWyboru(RODZAJE_KONSTRUKCJI, m.rodzajKonstrukcji, 'rodzaj')}
    <div class="podtytul">Wyposażenie budynku</div>
    ${grupaWyboru(WYPOSAZENIE.concat(m.wyposazenieDodatkowe || []), m.wyposazenie, 'wyposazenie')}
    <div class="insp-dodaj">
      <input id="wyp-nowa" placeholder="Wpisz własną pozycję wyposażenia…" />
      <button class="btn-mini" data-action="dodaj-wyp">➕ Dodaj pozycję</button>
    </div>
    <div class="podtytul">Osoby wykonujące przegląd</div>
    ${inspektorzy}
    <div class="insp-dodaj">
      <select data-osoba-select title="Dodaj osobę z zapisanej listy">
        <option value="">➕ Dodaj z listy…</option>
        ${OSOBY_PRZEGLAD.map((o, i) => `<option value="${i}">${esc(o.imie)} — ${esc(o.specjalnosc)}</option>`).join('')}
      </select>
      <button class="btn-mini" data-action="dodaj-insp">➕ Pusty wiersz</button>
    </div>
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
      <div class="ust-akcje">
        <button class="btn-mini" data-action="zal-gora" data-zal="${z.id}" title="Przesuń wyżej" ${i === 0 ? 'disabled' : ''}>▲</button>
        <button class="btn-mini" data-action="zal-dol" data-zal="${z.id}" title="Przesuń niżej" ${i === doc.rozdzialI.length - 1 ? 'disabled' : ''}>▼</button>
        <button class="btn-mini btn-del" data-action="usun-zal" data-zal="${z.id}">✕</button>
      </div>
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
    <button class="btn" data-action="wstaw-standardowe">📋 Wstaw standardowe sekcje</button>
  </div>`;
}

// Renderuje miniatury zdjęć dla celu (ustalenie lub sekcja).
function renderGaleria(sekId, ustId, zdjecia) {
  const attrUst = ustId ? `data-ust="${ustId}"` : '';
  const arr = zdjecia || [];
  const parentOcena = ocenaUstalenia(sekId, ustId) || 'Dobry';
  return arr.map((z, i) => {
    const ocenaZdj = z.ocena || parentOcena;
    return `
    <figure class="foto">
      <img data-foto-img="${z.id}" data-action="foto-menu" data-sec="${sekId}" ${attrUst} data-foto="${z.id}"
        src="${urlZdjecia(z) || ''}" alt="zdjęcie" loading="lazy" title="Kliknij, aby przenieść zdjęcie" />
      <button class="foto-del" data-action="usun-foto" data-sec="${sekId}" ${attrUst} data-foto="${z.id}">✕</button>
      <label class="foto-ocena">Stan techniczny:
        <select data-sec="${sekId}" ${attrUst} data-foto="${z.id}" data-field="foto-ocena">
          ${STANY_TECHNICZNE.map((o) =>
    `<option value="${o.value}" ${o.value === ocenaZdj ? 'selected' : ''}>${o.value}</option>`).join('')}
        </select>
      </label>
      <textarea class="foto-opis" data-sec="${sekId}" ${attrUst} data-foto="${z.id}" data-field="opis"
        rows="2" placeholder="Opis i zalecenia (np. elewacja czysta)">${escapeHtml(z.opis)}</textarea>
      <div class="foto-order">
        <button class="btn-mini" data-action="foto-lewo" data-sec="${sekId}" ${attrUst} data-foto="${z.id}" title="Wcześniej" ${i === 0 ? 'disabled' : ''}>◀</button>
        <button class="btn-mini" data-action="foto-prawo" data-sec="${sekId}" ${attrUst} data-foto="${z.id}" title="Później" ${i === arr.length - 1 ? 'disabled' : ''}>▶</button>
      </div>
      <button class="foto-move-btn" data-action="foto-menu" data-sec="${sekId}" ${attrUst} data-foto="${z.id}">↪ Przenieś do…</button>
    </figure>`;
  }).join('');
}

// Lista gotowych elementów (podpowiedzi ustaleń) dla sekcji — po kluczu lub tytule.
function podpowiedziSekcji(s) {
  return PODPOWIEDZI_SEKCJI[s.klucz] || PODPOWIEDZI_SEKCJI[(s.title || '').trim()] || null;
}

function kartaSekcji(s) {
  const aktywna = s.id === aktywnaSekcjaId;

  const ustalenia = s.ustalenia.map((u, i) => {
    const fot = renderGaleria(s.id, u.id, u.zdjecia);
    const liczba = (u.zdjecia || []).length;
    return `
    <div class="ust-card" data-ust-card="${u.id}">
      <div class="ust-row">
        <span class="ust-lp">${i + 1}</span>
        <div class="ust-tresc">
          <input class="ust-element" data-sec="${s.id}" data-ust="${u.id}" data-field="element"
            placeholder="Element (np. Obróbki blacharskie)" value="${esc(u.element)}" />
          <textarea data-sec="${s.id}" data-ust="${u.id}" data-field="text" rows="2"
            placeholder="Opis stanu / usterki…">${escapeHtml(u.text)}</textarea>
          <label class="ust-ocena">Ocena stanu:
            <select data-sec="${s.id}" data-ust="${u.id}" data-field="ocena">
              ${STANY_TECHNICZNE.map((o) =>
    `<option value="${o.value}" ${o.value === u.ocena ? 'selected' : ''}>${o.value}</option>`).join('')}
            </select>
          </label>
        </div>
        <select data-sec="${s.id}" data-ust="${u.id}" data-field="pilnosc" title="Stopień pilności">
          ${STOPNIE_PILNOSCI.map((sp) =>
    `<option value="${sp.value}" ${sp.value === u.pilnosc ? 'selected' : ''}>${sp.label}</option>`).join('')}
        </select>
        <div class="ust-akcje">
          <button class="btn-mini" data-action="ust-gora" data-sec="${s.id}" data-ust="${u.id}" title="Przesuń wyżej" ${i === 0 ? 'disabled' : ''}>▲</button>
          <button class="btn-mini" data-action="ust-dol" data-sec="${s.id}" data-ust="${u.id}" title="Przesuń niżej" ${i === s.ustalenia.length - 1 ? 'disabled' : ''}>▼</button>
          <button class="btn-mini btn-del" data-action="usun-ust" data-sec="${s.id}" data-ust="${u.id}">✕</button>
        </div>
      </div>
      <div class="ust-foto">
        <div class="ust-foto-akcje">
          <span class="foto-label">📷 Zdjęcia ustalenia (${liczba})</span>
          <button class="btn-mini" data-action="aparat" data-sec="${s.id}" data-ust="${u.id}">📸 Aparat</button>
          <button class="btn-mini" data-action="z-pliku" data-sec="${s.id}" data-ust="${u.id}">🖼️ Zdjęcie</button>
          <span class="hint">wklej (Ctrl+V) / przeciągnij tutaj</span>
        </div>
        <div class="galeria mini" data-drop-sec="${s.id}" data-drop-ust="${u.id}">
          ${fot || '<span class="pusto-mini">Brak zdjęć dla tego ustalenia.</span>'}
        </div>
      </div>
    </div>`;
  }).join('');

  const liczbaOgolne = (s.zdjecia || []).length;
  const zdjeciaOgolne = renderGaleria(s.id, null, s.zdjecia);

  return `
  <section class="karta sekcja ${aktywna ? 'aktywna' : ''}" data-sec-card="${s.id}">
    <div class="sekcja-head">
      <input class="sekcja-title" data-sec="${s.id}" data-field="title"
        placeholder="Nazwa obszaru kontroli" value="${esc(s.title)}" />
      <button class="btn-mini" data-action="sekcja-gora" data-sec="${s.id}" title="Przesuń sekcję wyżej" ${indeksSekcji(s.id) === 0 ? 'disabled' : ''}>▲</button>
      <button class="btn-mini" data-action="sekcja-dol" data-sec="${s.id}" title="Przesuń sekcję niżej" ${indeksSekcji(s.id) === doc.sekcje.length - 1 ? 'disabled' : ''}>▼</button>
      <button class="btn-mini btn-del" data-action="usun-sekcje" data-sec="${s.id}">🗑️</button>
    </div>

    <div class="ustalenia">
      ${ustalenia || '<p class="pusto-mini">Brak ustaleń. Dodaj pierwsze ↓</p>'}
      <div class="ust-dodaj">
        <button class="btn-mini" data-action="dodaj-ust" data-sec="${s.id}">➕ Dodaj ustalenie</button>
        ${podpowiedziSekcji(s) ? `
        <select data-elem-select data-sec="${s.id}" title="Wstaw gotowy element">
          <option value="">➕ Dodaj element z listy…</option>
          ${podpowiedziSekcji(s).map((el) => `<option value="${esc(el)}">${esc(el)}</option>`).join('')}
        </select>` : ''}
      </div>
    </div>

    <details class="ogolne-zdj" ${liczbaOgolne ? 'open' : ''}>
      <summary>📷 Zdjęcia ogólne sekcji (bez przypisania do ustalenia) — ${liczbaOgolne}</summary>
      <div class="zdj-akcje">
        <button class="btn-mini" data-action="aparat" data-sec="${s.id}">📸 Aparat</button>
        <button class="btn-mini" data-action="z-pliku" data-sec="${s.id}">🖼️ Z plików</button>
        <span class="hint">albo wklej / przeciągnij poniżej</span>
      </div>
      <div class="galeria" data-drop-sec="${s.id}">
        ${zdjeciaOgolne || '<p class="pusto-mini">Brak zdjęć ogólnych.</p>'}
      </div>
    </details>
  </section>`;
}

// Zbiera zalecenia z Rozdziału II (ustalenia z nadanym stopniem pilności 1–4).
function zebraneZalecenia() {
  const out = [];
  for (const s of doc.sekcje) {
    for (const u of s.ustalenia) {
      if (wchodziDoZalecen(u.pilnosc)) {
        const el = (u.element || '').trim();
        const tx = (u.text || '').trim();
        const tresc = el ? (tx ? `${el} – ${tx}` : el) : tx;
        out.push({ element: el, text: tx, tresc, pilnosc: u.pilnosc, etykieta: etykietaPilnosci(u.pilnosc) });
      }
    }
  }
  return out;
}

function sekcjaPodsumowania() {
  const zal = zebraneZalecenia();
  const wiersze = zal.map((z, i) => `
    <tr>
      <td class="z-lp">${i + 1}</td>
      <td>${z.element ? `<strong>${escapeHtml(z.element)}</strong>${z.text ? ' – ' : ''}` : ''}${escapeHtml(z.text)}</td>
      <td class="z-pil">${escapeHtml(z.etykieta)}</td>
    </tr>`).join('');
  const tabela = zal.length ? `
    <table class="zal-tabela">
      <thead><tr><th>L.p.</th><th>Zalecenia</th><th>Stopień pilności</th></tr></thead>
      <tbody>${wiersze}</tbody>
    </table>` : '<p class="pusto-mini">Brak zaleceń — nadaj ustaleniom w Rozdziale II stopień pilności 1–4, a pojawią się tu automatycznie.</p>';

  return `
  <div class="naglowek-rozdzialu">📝 ROZDZIAŁ III — Zalecenia, podsumowanie i wnioski</div>
  <div class="karta">
    <div class="podtytul">Zalecenia (generowane automatycznie z Rozdziału II) — ${zal.length}</div>
    ${tabela}
    <div class="podtytul" style="margin-top:14px;">Dodatkowe podsumowanie i wnioski (opcjonalnie)</div>
    ${pole('Każdy akapit w nowej linii', { meta: 'podsumowanie-pole', field: 'podsumowanie' },
    doc.podsumowanie, { textarea: true, rows: 5 })}
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
      const ust = el.closest('[data-ust-card]');
      aktywneUstId = ust ? ust.getAttribute('data-ust-card') : null;
    }
  });
  // Wklejanie zdjęć ze schowka — do aktywnego ustalenia (lub ogólnych sekcji)
  document.addEventListener('paste', (e) => {
    const obrazy = obrazyZeSchowka(e.clipboardData);
    if (obrazy.length) {
      e.preventDefault();
      const sek = aktualnaSekcja();
      if (sek) dodajZdjecia(sek.id, aktywneUstId, obrazy);
      else pokazToast('Najpierw dodaj sekcję, aby wkleić zdjęcie.');
    }
  });
  // Przeciąganie i upuszczanie zdjęć na galerię (ustalenia lub ogólną)
  app.addEventListener('dragover', (e) => {
    if (e.target.closest('[data-drop-sec],[data-drop-glowne]')) { e.preventDefault(); }
  });
  app.addEventListener('drop', (e) => {
    const gl = e.target.closest('[data-drop-glowne]');
    if (gl) {
      e.preventDefault();
      const pliki = [...(e.dataTransfer?.files || [])];
      if (pliki.length) dodajZdjecieGlowne(pliki);
      return;
    }
    const strefa = e.target.closest('[data-drop-sec]');
    if (!strefa) return;
    e.preventDefault();
    const sekId = strefa.getAttribute('data-drop-sec');
    const ustId = strefa.getAttribute('data-drop-ust') || null;
    const pliki = [...(e.dataTransfer?.files || [])];
    if (pliki.length) dodajZdjecia(sekId, ustId, pliki);
  });

  // Input pliku (z galerii) — używa ostatnio wybranego celu
  document.getElementById('plik-zdjecie').addEventListener('change', (e) => {
    if (celZdjecia.glowne) { dodajZdjecieGlowne([...e.target.files]); return; }
    const { sekId, ustId } = celZdjecia.sekId ? celZdjecia : { sekId: aktywnaSekcjaId, ustId: null };
    if (sekId) dodajZdjecia(sekId, ustId, [...e.target.files]);
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
    const cl = e.target.closest('[data-cloud]');
    if (cl) obsluzChmura(cl.getAttribute('data-cloud'), cl);
    const sp = e.target.closest('[data-supa]');
    if (sp) obsluzSupa(sp.getAttribute('data-supa'));
  });
  // Przełącznik automatycznej kopii (checkbox w panelu chmury)
  document.body.addEventListener('change', (e) => {
    const cl = e.target.closest('[data-cloud="auto"]');
    if (cl) obsluzChmura('auto', cl);
  });
}

function onClick(e) {
  // Kliknięcie w tło okna „Przenieś zdjęcie" — zamknij
  if (e.target.classList && e.target.classList.contains('przenies-tlo')) {
    przenoszone = null; render(); return;
  }
  const b = e.target.closest('[data-action]');
  if (!b) return;
  const action = b.getAttribute('data-action');
  const sec = b.getAttribute('data-sec');
  switch (action) {
    case 'zapisz': zapisz(true); pokazToast('Zapisano.'); break;
    case 'eksport': eksportujDocx(); break;
    case 'chmura': otworzSupa(); break;
    case 'projekty': if (doc) zapisz(true); pokazWybor(); break;
    case 'nowy-projekt': nowyProjekt(); break;
    case 'otworz-projekt': otworzProjekt(b.getAttribute('data-id')); break;
    case 'usun-projekt': usunProjektZListy(b.getAttribute('data-id')); break;
    case 'dodaj-sekcje': {
      const inp = document.getElementById('nowa-sekcja-nazwa');
      dodajSekcje(inp.value.trim());
      break;
    }
    case 'wstaw-standardowe': wstawStandardoweSekcje(); break;
    case 'usun-sekcje': if (confirm('Usunąć całą sekcję wraz ze zdjęciami?')) usunSekcje(sec); break;
    case 'dodaj-ust': dodajUstalenie(sec, ''); break;
    case 'usun-ust': usunUstalenie(sec, b.getAttribute('data-ust')); break;
    case 'ust-gora': przesunUstalenie(sec, b.getAttribute('data-ust'), -1); break;
    case 'ust-dol': przesunUstalenie(sec, b.getAttribute('data-ust'), 1); break;
    case 'sekcja-gora': przesunSekcje(sec, -1); break;
    case 'sekcja-dol': przesunSekcje(sec, 1); break;
    case 'aparat': otworzWyborZdjecia(sec, b.getAttribute('data-ust'), true); break;
    case 'z-pliku': otworzWyborZdjecia(sec, b.getAttribute('data-ust'), false); break;
    case 'glowne-aparat': otworzWyborGlowne(true); break;
    case 'glowne-plik': otworzWyborGlowne(false); break;
    case 'usun-glowne': usunZdjecieGlowne(); break;
    case 'usun-foto': usunZdjecieZCelu(sec, b.getAttribute('data-ust'), b.getAttribute('data-foto')); break;
    case 'foto-menu':
      przenoszone = { sekId: sec, ustId: b.getAttribute('data-ust') || null, fotoId: b.getAttribute('data-foto') };
      render();
      break;
    case 'foto-lewo': przesunZdjecieWGalerii(sec, b.getAttribute('data-ust'), b.getAttribute('data-foto'), -1); break;
    case 'foto-prawo': przesunZdjecieWGalerii(sec, b.getAttribute('data-ust'), b.getAttribute('data-foto'), 1); break;
    case 'zamknij-przenies': przenoszone = null; render(); break;
    case 'przenies-do': {
      const p = przenoszone; przenoszone = null;
      if (p) przeniesZdjecie(p.sekId, p.ustId, p.fotoId, b.getAttribute('data-cel'));
      else render();
      break;
    }
    case 'dodaj-insp': dodajInspektora(); break;
    case 'dodaj-wyp': {
      const inp = document.getElementById('wyp-nowa');
      dodajWyposazenieOpcja(inp ? inp.value : '');
      break;
    }
    case 'usun-insp': usunInspektora(parseInt(b.getAttribute('data-i'), 10)); break;
    case 'dodaj-zal': dodajZalecenieI(); break;
    case 'usun-zal': usunZalecenieI(b.getAttribute('data-zal')); break;
    case 'zal-gora': przesunZalecenieI(b.getAttribute('data-zal'), -1); break;
    case 'zal-dol': przesunZalecenieI(b.getAttribute('data-zal'), 1); break;
    default: break;
  }
}

// Zamienia pierwszą literę tekstu na wielką (pomija początkowe spacje/enter).
function zWielkiej(s) {
  return (s || '').replace(/^(\s*)(\p{Ll})/u, (_, sp, ch) => sp + ch.toUpperCase());
}
// Wymusza wielką literę na początku pola tekstowego (zachowuje pozycję kursora — długość bez zmian).
function wymusWielkaLitere(el) {
  const nowy = zWielkiej(el.value);
  if (nowy !== el.value) {
    const pos = el.selectionStart;
    el.value = nowy;
    try { el.setSelectionRange(pos, pos); } catch (e) { /* ignore */ }
  }
}

function onInput(e) {
  const el = e.target;
  // Wymuś wielką literę na początku opisu / treści (podrozdział, podpis zdjęcia, zalecenia Rozdz. I)
  const polePisane = el.getAttribute('data-field');
  if (polePisane === 'opis' || polePisane === 'text') wymusWielkaLitere(el);
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
    if (foto && field === 'opis') {
      // Podpis zdjęcia — w ustaleniu lub w galerii ogólnej sekcji
      const arr = tablicaZdjec(sec, ust);
      const z = arr && arr.find((x) => x.id === foto);
      if (z) z.opis = el.value;
    } else if (ust && (field === 'text' || field === 'element')) {
      const u = s.ustalenia.find((x) => x.id === ust);
      if (u) u[field] = el.value;
    } else if (field === 'title') {
      s.title = el.value;
    }
    zapisz();
  }
}

function onChange(e) {
  const el = e.target;
  // Pole meta wybierane z listy (np. rodzaj kontroli)
  const metaSel = el.getAttribute && el.getAttribute('data-meta-select');
  if (metaSel) { doc.meta[metaSel] = el.value; zapisz(); return; }
  // Wybór osoby z zapisanej listy
  if (el.hasAttribute && el.hasAttribute('data-osoba-select')) {
    if (el.value !== '') dodajInspektoraZListy(parseInt(el.value, 10));
    return;
  }
  // Wstawienie gotowego elementu jako ustalenia (element pogrubiony + pusty opis)
  if (el.hasAttribute && el.hasAttribute('data-elem-select')) {
    const sec = el.getAttribute('data-sec');
    if (sec && el.value !== '') dodajUstalenie(sec, '', el.value);
    return;
  }
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
      if (f === 'pilnosc') z.pilnosc = el.value;
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
  const foto = el.getAttribute('data-foto');
  if (foto && field === 'foto-ocena') {
    const arr = tablicaZdjec(sec, ust || null);
    const z = arr && arr.find((x) => x.id === foto);
    if (z) z.ocena = el.value;
    zapisz(); return;
  }
  if (ust && field === 'pilnosc') {
    const u = s.ustalenia.find((x) => x.id === ust);
    if (u) u.pilnosc = el.value;
    zapisz(); render(); // odśwież podgląd zaleceń w Rozdziale III
    return;
  } else if (ust && field === 'ocena') {
    const u = s.ustalenia.find((x) => x.id === ust);
    if (u) u.ocena = el.value;
  } else if (field === 'ogolnaOcena') {
    s.ogolnaOcena = el.value;
  }
  zapisz();
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

// ---------- Chmura (Google Drive) ----------
let backupTimer = null;
let backupWToku = false;

function zaplanujBackupChmura() {
  const st = cloud.status();
  if (!st.zalogowany || !st.autoBackup) return;
  if (backupTimer) clearTimeout(backupTimer);
  backupTimer = setTimeout(() => wykonajBackupChmura(false), 8000);
}

async function wykonajBackupChmura(reczny) {
  if (backupWToku) return;
  if (!cloud.status().zalogowany) { if (reczny) pokazToast('Najpierw zaloguj się do chmury.'); return; }
  backupWToku = true;
  if (reczny) pokazToast('Wysyłanie kopii do chmury…');
  try {
    const wynik = await cloud.backup(doc, { onPostep: (t) => { if (reczny) pokazToast(t); } });
    zapiszTeraz(); // zapisz doc z nadanym cloudId
    pokazToast('Kopia w chmurze zapisana ✓');
    odswiezPrzyciskChmura();
    odswiezPanelChmura();
  } catch (e) {
    console.error(e);
    pokazToast('Błąd kopii w chmurze: ' + e.message);
  } finally {
    backupWToku = false;
  }
}

function odswiezPrzyciskChmura() {
  const b = app.querySelector('[data-action="chmura"]');
  if (b) b.textContent = supa.status().zalogowany ? '☁️ Chmura ✓' : '☁️ Chmura';
}

function otworzChmure() {
  let modal = document.getElementById('chmura-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'chmura-modal';
    modal.className = 'modal-tlo';
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) zamknijChmure(); });
  }
  modal.innerHTML = panelChmuraHTML();
  modal.style.display = 'flex';
}
function zamknijChmure() {
  const m = document.getElementById('chmura-modal');
  if (m) m.style.display = 'none';
}
function odswiezPanelChmura() {
  const m = document.getElementById('chmura-modal');
  if (m && m.style.display !== 'none') m.innerHTML = panelChmuraHTML();
}

function panelChmuraHTML() {
  const st = cloud.status();
  let tresc;
  if (!st.skonfigurowany) {
    tresc = `
      <p>Aby włączyć kopię w chmurze (Twój Dysk Google), wklej <b>Identyfikator Google (Client ID)</b>.
      Instrukcję, jak go zdobyć za darmo, znajdziesz w README aplikacji.</p>
      <label class="pole"><span>Google Client ID</span>
        <input id="cl-client-id" placeholder="np. 1234-abcd.apps.googleusercontent.com" value="${esc(cloud.pobierzClientId())}" /></label>
      <div class="modal-akcje">
        <button class="btn btn-primary" data-cloud="zapisz-id">Zapisz</button>
        <button class="btn btn-ghost" data-cloud="zamknij">Zamknij</button>
      </div>`;
  } else if (!st.zalogowany) {
    tresc = `
      <p>Zaloguj się swoim kontem Google, aby zapisywać kopie protokołów na Dysku Google.</p>
      <div class="modal-akcje">
        <button class="btn btn-primary" data-cloud="zaloguj">🔐 Zaloguj przez Google</button>
        <button class="btn" data-cloud="zmien-id">Zmień Client ID</button>
        <button class="btn btn-ghost" data-cloud="zamknij">Zamknij</button>
      </div>`;
  } else {
    const kiedy = st.ostatniBackup ? new Date(st.ostatniBackup).toLocaleString('pl-PL') : 'jeszcze nie';
    tresc = `
      <p>Połączono z Google Drive${st.email ? ` jako <b>${esc(st.email)}</b>` : ''}.</p>
      <p class="hint">Ostatnia kopia: ${kiedy}</p>
      <label class="chip ${st.autoBackup ? 'on' : ''}" style="margin:6px 0;">
        <input type="checkbox" data-cloud="auto" ${st.autoBackup ? 'checked' : ''} /> <span>Automatyczna kopia po zmianach</span>
      </label>
      <div class="modal-akcje">
        <button class="btn btn-primary" data-cloud="backup">☁️ Zrób kopię teraz</button>
        <button class="btn" data-cloud="przywroc">⬇️ Przywróć z chmury</button>
      </div>
      <div id="cl-lista"></div>
      <div class="modal-akcje">
        <button class="btn btn-ghost" data-cloud="wyloguj">Wyloguj</button>
        <button class="btn btn-ghost" data-cloud="zamknij">Zamknij</button>
      </div>`;
  }
  return `<div class="modal-okno">
    <div class="modal-tytul">☁️ Kopia w chmurze (Google Drive)</div>
    ${tresc}
  </div>`;
}

async function pokazListeKopii() {
  const box = document.getElementById('cl-lista');
  if (!box) return;
  box.innerHTML = '<p class="hint">Wczytywanie listy kopii…</p>';
  try {
    const lista = await cloud.listaKopii();
    if (!lista.length) { box.innerHTML = '<p class="hint">Brak kopii w chmurze.</p>'; return; }
    box.innerHTML = '<div class="kopie-lista">' + lista.map((k) => `
      <div class="kopia-row">
        <span>${esc(k.nazwa)}<br><small class="hint">${new Date(k.zmodyfikowano).toLocaleString('pl-PL')}</small></span>
        <button class="btn-mini" data-cloud="przywroc-plik" data-file="${k.id}">Przywróć</button>
      </div>`).join('') + '</div>';
  } catch (e) {
    box.innerHTML = `<p class="hint">Błąd listy: ${esc(e.message)}</p>`;
  }
}

async function przywrocZChmury(fileId) {
  if (!confirm('Przywrócić ten protokół z chmury? Bieżące dane w aplikacji zostaną zastąpione.')) return;
  pokazToast('Przywracanie z chmury…');
  try {
    const pobrany = await cloud.przywroc(fileId, { onPostep: (t) => pokazToast(t) });
    for (const s of doc.sekcje || []) {
      for (const z of s.zdjecia || []) zwolnijUrl(z.id);
      for (const u of s.ustalenia || []) for (const z of u.zdjecia || []) zwolnijUrl(z.id);
    }
    doc = normalizuj(pobrany);
    aktywnaSekcjaId = doc.sekcje.length ? doc.sekcje[doc.sekcje.length - 1].id : null;
    aktywneUstId = null;
    zapiszTeraz(); // zapisz jako projekt lokalny
    render();
    zamknijChmure();
    pokazToast('Przywrócono protokół z chmury ✓');
  } catch (e) {
    console.error(e);
    pokazToast('Błąd przywracania: ' + e.message);
  }
}

async function obsluzChmura(akcja, el) {
  switch (akcja) {
    case 'zapisz-id': case 'zmien-id': {
      if (akcja === 'zmien-id') { cloud.ustawClientId(''); odswiezPanelChmura(); break; }
      const v = document.getElementById('cl-client-id')?.value || '';
      if (!v.trim()) { pokazToast('Wklej Client ID.'); break; }
      cloud.ustawClientId(v);
      pokazToast('Zapisano Client ID.');
      odswiezPanelChmura();
      break;
    }
    case 'zaloguj':
      try { await cloud.zaloguj(); odswiezPanelChmura(); odswiezPrzyciskChmura(); pokazToast('Zalogowano do Google Drive ✓'); }
      catch (e) { pokazToast('Logowanie nieudane: ' + e.message); }
      break;
    case 'wyloguj': cloud.wyloguj(); odswiezPanelChmura(); odswiezPrzyciskChmura(); break;
    case 'auto': cloud.ustawAuto(el.checked); break;
    case 'backup': await wykonajBackupChmura(true); break;
    case 'przywroc': pokazListeKopii(); break;
    case 'przywroc-plik': await przywrocZChmury(el.getAttribute('data-file')); break;
    case 'zamknij': zamknijChmure(); break;
    default: break;
  }
}

// ---------- Panel chmury (Supabase) ----------
function otworzSupa() {
  let modal = document.getElementById('supa-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'supa-modal';
    modal.className = 'modal-tlo';
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) zamknijSupa(); });
  }
  modal.innerHTML = panelSupaHTML();
  modal.style.display = 'flex';
}
function zamknijSupa() { const m = document.getElementById('supa-modal'); if (m) m.style.display = 'none'; }
function odswiezPanelSupa() {
  const m = document.getElementById('supa-modal');
  if (m && m.style.display !== 'none') m.innerHTML = panelSupaHTML();
}

function panelSupaHTML() {
  const st = supa.status();
  let tresc;
  if (!st.skonfigurowany) {
    tresc = `
      <p>Aby mieć te same protokoły na telefonie i komputerze, połącz aplikację ze swoim
      darmowym projektem <b>Supabase</b>. Instrukcja krok po kroku jest w README.</p>
      <label class="pole"><span>Adres projektu (Project URL)</span>
        <input id="supa-url" placeholder="https://xxxx.supabase.co" value="${esc(supa.pobierzUrl())}" /></label>
      <label class="pole"><span>Klucz publiczny (anon public key)</span>
        <input id="supa-key" placeholder="eyJhbGciOi..." value="${esc(supa.pobierzKey())}" /></label>
      <div class="modal-akcje">
        <button class="btn btn-primary" data-supa="zapisz-konfig">Zapisz</button>
        <button class="btn btn-ghost" data-supa="zamknij">Zamknij</button>
      </div>`;
  } else if (!st.zalogowany) {
    tresc = `
      <p>Zaloguj się (ten sam e-mail i hasło na telefonie i komputerze).</p>
      <label class="pole"><span>E-mail</span><input id="supa-email" type="email" placeholder="ty@example.com" /></label>
      <label class="pole"><span>Hasło</span><input id="supa-haslo" type="password" placeholder="hasło (min. 6 znaków)" /></label>
      <div class="modal-akcje">
        <button class="btn btn-primary" data-supa="zaloguj">🔐 Zaloguj</button>
        <button class="btn" data-supa="zarejestruj">Utwórz konto</button>
      </div>
      <div class="modal-akcje">
        <button class="btn btn-ghost" data-supa="zmien-konfig">Zmień dane Supabase</button>
        <button class="btn btn-ghost" data-supa="zamknij">Zamknij</button>
      </div>`;
  } else {
    tresc = `
      <p>Połączono z chmurą jako <b>${esc(st.email || '')}</b>.</p>
      <p class="hint">Projekty synchronizują się automatycznie. Na drugim urządzeniu zaloguj się tym samym kontem — zobaczysz tu tę samą listę.</p>
      <div class="modal-akcje">
        <button class="btn btn-primary" data-supa="sync">☁️ Synchronizuj teraz</button>
        <button class="btn" data-supa="wyslij">⬆️ Wyślij wszystkie moje projekty do chmury</button>
      </div>
      <div class="modal-akcje">
        <button class="btn btn-ghost" data-supa="wyloguj">Wyloguj</button>
        <button class="btn btn-ghost" data-supa="zamknij">Zamknij</button>
      </div>`;
  }
  return `<div class="modal-okno"><div class="modal-tytul">☁️ Chmura — synchronizacja (Supabase)</div>${tresc}</div>`;
}

async function obsluzSupa(akcja) {
  switch (akcja) {
    case 'zapisz-konfig': {
      const u = document.getElementById('supa-url')?.value || '';
      const k = document.getElementById('supa-key')?.value || '';
      if (!u.trim() || !k.trim()) { pokazToast('Wklej adres projektu i klucz.'); break; }
      await supa.ustawKonfig(u, k);
      pokazToast('Zapisano dane Supabase.');
      odswiezPanelSupa();
      break;
    }
    case 'zmien-konfig': supa.ustawKonfig('', ''); odswiezPanelSupa(); break;
    case 'zaloguj': case 'zarejestruj': {
      const mail = document.getElementById('supa-email')?.value || '';
      const haslo = document.getElementById('supa-haslo')?.value || '';
      if (!mail.trim() || !haslo.trim()) { pokazToast('Podaj e-mail i hasło.'); break; }
      try {
        if (akcja === 'zarejestruj') {
          await supa.zarejestruj(mail, haslo);
          if (!supa.zalogowany()) {
            pokazToast('Konto utworzone. Sprawdź e-mail, kliknij link potwierdzający, a potem kliknij „Zaloguj”.');
            odswiezPanelSupa();
            break;
          }
          pokazToast('Konto utworzone — zalogowano ✓');
        } else {
          await supa.zaloguj(mail, haslo);
          pokazToast('Zalogowano ✓');
        }
        odswiezPrzyciskChmura();
        zamknijSupa();
        await wyslijLokalneDoChmury(); // wyślij dotychczasowe projekty do chmury
        await pokazWybor(); // pokaż projekty z chmury
      } catch (e) {
        const m = (e && e.message) ? e.message : String(e);
        if (/not confirmed|confirm/i.test(m)) {
          pokazToast('Najpierw potwierdź konto: kliknij link w e-mailu od Supabase, potem „Zaloguj”.');
        } else if (/invalid login|credentials/i.test(m)) {
          pokazToast('Błędny e-mail lub hasło.');
        } else {
          pokazToast('Błąd: ' + m);
        }
      }
      break;
    }
    case 'sync':
      if (doc) { try { await supa.zapiszProjekt(doc); pokazToast('Zsynchronizowano ✓'); } catch (e) { pokazToast('Błąd sync: ' + e.message); } }
      else { pokazToast('Otwórz projekt, aby go zsynchronizować.'); }
      break;
    case 'wyslij':
      zamknijSupa();
      await wyslijLokalneDoChmury();
      await pokazWybor();
      break;
    case 'wyloguj': await supa.wyloguj(); odswiezPrzyciskChmura(); odswiezPanelSupa(); await pokazWybor(); break;
    case 'zamknij': zamknijSupa(); break;
    default: break;
  }
}

// ---------- Util ----------
function esc(s) { return (s ?? '').toString().replace(/"/g, '&quot;'); }
function escapeHtml(s) {
  return (s ?? '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

init();
