// Kopia zapasowa w chmurze — Google Drive (logowanie kontem Google).
// Działa w pełni po stronie przeglądarki (Google Identity Services + Drive REST).
// Dane trafiają na Dysk Google użytkownika, do folderu aplikacji.
import { wczytajZdjecie, zapiszZdjecie } from './storage.js';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const SCOPE = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email openid';
const FOLDER = 'Protokoły kontroli — kopie';
const LS_CLIENT = 'cloud_client_id';
const LS_STAN = 'cloud_stan'; // { email, ostatniBackup }

let clientId = localStorage.getItem(LS_CLIENT) || '';
let accessToken = null;
let tokenExpiry = 0;
let tokenClient = null;
let folderId = null;
let email = null;
let gisGotowe = null; // Promise
const sluchacze = new Set();

function emit() { for (const cb of sluchacze) { try { cb(status()); } catch (e) {} } }

export function onZmiana(cb) { sluchacze.add(cb); return () => sluchacze.delete(cb); }

export function skonfigurowany() { return !!clientId; }
export function pobierzClientId() { return clientId; }
export function ustawClientId(id) {
  clientId = (id || '').trim();
  localStorage.setItem(LS_CLIENT, clientId);
  tokenClient = null; accessToken = null;
  emit();
}

export function zalogowany() { return !!accessToken && Date.now() < tokenExpiry; }

function zapiszStanLokalnie(patch) {
  const cur = JSON.parse(localStorage.getItem(LS_STAN) || '{}');
  const next = { ...cur, ...patch };
  localStorage.setItem(LS_STAN, JSON.stringify(next));
  return next;
}
export function status() {
  const s = JSON.parse(localStorage.getItem(LS_STAN) || '{}');
  return {
    skonfigurowany: skonfigurowany(),
    zalogowany: zalogowany(),
    email: email || s.email || null,
    ostatniBackup: s.ostatniBackup || null,
    autoBackup: s.autoBackup !== false, // domyślnie włączone gdy zalogowany
  };
}
export function ustawAuto(wl) { zapiszStanLokalnie({ autoBackup: !!wl }); emit(); }

function zaladujGIS() {
  if (gisGotowe) return gisGotowe;
  gisGotowe = new Promise((res, rej) => {
    if (window.google && window.google.accounts) return res();
    const s = document.createElement('script');
    s.src = GIS_SRC; s.async = true; s.defer = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error('Nie udało się załadować Google Identity Services.'));
    document.head.appendChild(s);
  });
  return gisGotowe;
}

// Interaktywne logowanie (uzyskanie tokenu dostępu).
export async function zaloguj() {
  if (!clientId) throw new Error('Brak identyfikatora Google (Client ID).');
  await zaladujGIS();
  const token = await new Promise((res, rej) => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error) return rej(new Error(resp.error));
        res(resp);
      },
    });
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
  accessToken = token.access_token;
  tokenExpiry = Date.now() + (token.expires_in ? token.expires_in * 1000 : 3600 * 1000) - 60000;
  await pobierzEmail();
  zapiszStanLokalnie({ email });
  emit();
}

export function wyloguj() {
  if (accessToken && window.google?.accounts?.oauth2) {
    try { window.google.accounts.oauth2.revoke(accessToken, () => {}); } catch (e) {}
  }
  accessToken = null; tokenExpiry = 0; email = null; folderId = null;
  zapiszStanLokalnie({ email: null });
  emit();
}

// Ciche odświeżenie tokenu (bez okna), gdy wygasł.
async function upewnijToken() {
  if (zalogowany()) return;
  if (!tokenClient) { await zaloguj(); return; }
  await new Promise((res, rej) => {
    tokenClient.callback = (resp) => {
      if (resp.error) return rej(new Error(resp.error));
      accessToken = resp.access_token;
      tokenExpiry = Date.now() + (resp.expires_in ? resp.expires_in * 1000 : 3600 * 1000) - 60000;
      res();
    };
    try { tokenClient.requestAccessToken({ prompt: '' }); } catch (e) { rej(e); }
  });
}

async function api(url, opts = {}) {
  await upewnijToken();
  const r = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${accessToken}`, ...(opts.headers || {}) } });
  if (r.status === 401) { // token wygasł — spróbuj raz jeszcze
    accessToken = null;
    await upewnijToken();
    return fetch(url, { ...opts, headers: { Authorization: `Bearer ${accessToken}`, ...(opts.headers || {}) } });
  }
  return r;
}

async function pobierzEmail() {
  try {
    const r = await api('https://www.googleapis.com/oauth2/v3/userinfo');
    if (r.ok) { const j = await r.json(); email = j.email || null; }
  } catch (e) { /* ignore */ }
}

async function upewnijFolder() {
  if (folderId) return folderId;
  const q = encodeURIComponent(`name='${FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const r = await api(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`);
  const j = await r.json();
  if (j.files && j.files.length) { folderId = j.files[0].id; return folderId; }
  const r2 = await api('https://www.googleapis.com/drive/v3/files', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER, mimeType: 'application/vnd.google-apps.folder' }),
  });
  const j2 = await r2.json();
  folderId = j2.id;
  return folderId;
}

// Multipart upload/aktualizacja pliku.
async function wyslijPlik({ fileId, metadata, blob }) {
  const boundary = 'granica-protokol-' + (metadata.name || 'x').replace(/\W/g, '');
  const meta = JSON.stringify(metadata);
  const head = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${blob.type || 'application/octet-stream'}\r\n\r\n`;
  const tail = `\r\n--${boundary}--`;
  const body = new Blob([head, blob, tail], { type: `multipart/related; boundary=${boundary}` });
  const base = 'https://www.googleapis.com/upload/drive/v3/files';
  const url = fileId
    ? `${base}/${fileId}?uploadType=multipart&fields=id`
    : `${base}?uploadType=multipart&fields=id`;
  const r = await api(url, { method: fileId ? 'PATCH' : 'POST', body });
  if (!r.ok) throw new Error('Błąd zapisu pliku na Dysku: ' + r.status);
  return (await r.json()).id;
}

async function znajdzPlik(q) {
  const r = await api(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,appProperties,modifiedTime)&orderBy=modifiedTime desc`);
  const j = await r.json();
  return j.files || [];
}

// Wykonuje kopię: wysyła brakujące zdjęcia + plik protokołu (JSON).
export async function backup(doc, { onPostep } = {}) {
  if (!doc.cloudId) doc.cloudId = 'doc_' + Math.abs(hash(JSON.stringify(doc.meta) + Date.now())).toString(36);
  const fld = await upewnijFolder();

  // Zbierz wszystkie id zdjęć w dokumencie
  const idZdjec = [];
  for (const s of doc.sekcje || []) {
    for (const z of s.zdjecia || []) idZdjec.push(z.id);
    for (const u of s.ustalenia || []) for (const z of u.zdjecia || []) idZdjec.push(z.id);
  }

  // Sprawdź, które zdjęcia są już na Dysku
  const istniejace = new Set();
  const foty = await znajdzPlik(`'${fld}' in parents and appProperties has { key='typ' and value='foto' } and trashed=false`);
  for (const f of foty) if (f.appProperties?.fotoId) istniejace.add(f.appProperties.fotoId);

  let wyslane = 0;
  for (const id of idZdjec) {
    if (istniejace.has(id)) continue;
    const blob = await wczytajZdjecie(id);
    if (!blob) continue;
    await wyslijPlik({
      metadata: { name: `foto_${id}.jpg`, parents: [fld], appProperties: { typ: 'foto', fotoId: id } },
      blob,
    });
    wyslane++;
    if (onPostep) onPostep(`Wysyłanie zdjęć: ${wyslane}/${idZdjec.length - istniejace.size}`);
  }

  // Wyślij / zaktualizuj plik protokołu
  const nazwa = `protokol_${(doc.meta.protokolNr || doc.cloudId).replace(/[\\/]/g, '-')}.json`;
  const istn = await znajdzPlik(`'${fld}' in parents and appProperties has { key='cloudId' and value='${doc.cloudId}' } and trashed=false`);
  const docBlob = new Blob([JSON.stringify(doc)], { type: 'application/json' });
  await wyslijPlik({
    fileId: istn[0]?.id,
    metadata: { name: nazwa, parents: [fld], appProperties: { typ: 'protokol', cloudId: doc.cloudId } },
    blob: docBlob,
  });

  const czas = new Date().toISOString();
  zapiszStanLokalnie({ ostatniBackup: czas });
  emit();
  return { wyslaneZdjecia: wyslane, czas };
}

// Lista kopii protokołów w chmurze.
export async function listaKopii() {
  const fld = await upewnijFolder();
  const pliki = await znajdzPlik(`'${fld}' in parents and appProperties has { key='typ' and value='protokol' } and trashed=false`);
  return pliki.map((f) => ({ id: f.id, nazwa: f.name, cloudId: f.appProperties?.cloudId, zmodyfikowano: f.modifiedTime }));
}

// Przywraca protokół z chmury: pobiera dokument i jego zdjęcia do IndexedDB.
export async function przywroc(fileId, { onPostep } = {}) {
  const r = await api(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
  if (!r.ok) throw new Error('Nie udało się pobrać pliku protokołu.');
  const doc = await r.json();

  const idZdjec = [];
  for (const s of doc.sekcje || []) {
    for (const z of s.zdjecia || []) idZdjec.push(z.id);
    for (const u of s.ustalenia || []) for (const z of u.zdjecia || []) idZdjec.push(z.id);
  }
  const fld = await upewnijFolder();
  const foty = await znajdzPlik(`'${fld}' in parents and appProperties has { key='typ' and value='foto' } and trashed=false`);
  const mapa = new Map();
  for (const f of foty) if (f.appProperties?.fotoId) mapa.set(f.appProperties.fotoId, f.id);

  let pobrane = 0;
  for (const id of idZdjec) {
    const dfid = mapa.get(id);
    if (!dfid) continue;
    const rr = await api(`https://www.googleapis.com/drive/v3/files/${dfid}?alt=media`);
    if (rr.ok) { await zapiszZdjecie(id, await rr.blob()); pobrane++; }
    if (onPostep) onPostep(`Pobieranie zdjęć: ${pobrane}/${idZdjec.length}`);
  }
  return doc;
}

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
  return h;
}
