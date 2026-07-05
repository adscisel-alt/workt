// Synchronizacja projektów przez Supabase (ta sama lista na telefonie i komputerze).
// Dane: tabela 'protokoly' (metadane + dokument jsonb), zdjęcia: Storage bucket 'zdjecia'.
import { createClient } from '@supabase/supabase-js';
import { wczytajZdjecie, zapiszZdjecie } from './storage.js';

const LS_URL = 'supa_url';
const LS_KEY = 'supa_key';
const LS_UP = 'supa_wyslane'; // lista id zdjęć już wysłanych

// Można wpisać na stałe (wtedy na każdym urządzeniu wystarczy samo logowanie).
// Klucz „anon public” jest przeznaczony do umieszczania w aplikacji (dane chroni RLS).
const DOMYSLNY_URL = 'https://wksfihvyccvvfdgicvji.supabase.co';
const DOMYSLNY_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indrc2ZpaHZ5Y2N2dmZkZ2ljdmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNjM2NTAsImV4cCI6MjA5ODgzOTY1MH0.EQd3epfubYJOOgOB6l4lqb1SZejMTbgJ00VxmuS8K0o';

let url = localStorage.getItem(LS_URL) || DOMYSLNY_URL;
let key = localStorage.getItem(LS_KEY) || DOMYSLNY_KEY;
let client = null;
let sesja = null;
const sluchacze = new Set();

function emit() { for (const c of sluchacze) { try { c(status()); } catch (e) {} } }
export function onZmiana(cb) { sluchacze.add(cb); return () => sluchacze.delete(cb); }

export function skonfigurowany() { return !!(url && key); }
export function pobierzUrl() { return url; }
export function pobierzKey() { return key; }

export function ustawKonfig(u, k) {
  url = (u || '').trim().replace(/\/+$/, '');
  key = (k || '').trim();
  localStorage.setItem(LS_URL, url);
  localStorage.setItem(LS_KEY, key);
  client = null; sesja = null;
  emit();
  return init();
}

function klient() {
  if (!client && url && key) {
    client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  }
  return client;
}

export async function init() {
  const c = klient();
  if (!c) return;
  try {
    const { data } = await c.auth.getSession();
    sesja = data.session || null;
    c.auth.onAuthStateChange((_e, s) => { sesja = s; emit(); });
  } catch (e) { /* ignore */ }
  emit();
}

export function zalogowany() { return !!sesja; }
export function email() { return sesja && sesja.user ? sesja.user.email : null; }
export function status() {
  return { skonfigurowany: skonfigurowany(), zalogowany: zalogowany(), email: email() };
}

export async function zarejestruj(mail, haslo) {
  const c = klient(); if (!c) throw new Error('Brak konfiguracji Supabase.');
  const { data, error } = await c.auth.signUp({ email: mail, password: haslo });
  if (error) throw error;
  if (data.session) sesja = data.session;
  emit();
  return data;
}
export async function zaloguj(mail, haslo) {
  const c = klient(); if (!c) throw new Error('Brak konfiguracji Supabase.');
  const { data, error } = await c.auth.signInWithPassword({ email: mail, password: haslo });
  if (error) throw error;
  sesja = data.session; emit();
  return data;
}
export async function wyloguj() {
  const c = klient(); if (!c) return;
  try { await c.auth.signOut(); } catch (e) {}
  sesja = null; emit();
}

// ---- Zbiór wysłanych zdjęć (żeby nie wysyłać w kółko) ----
function wyslaneSet() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_UP) || '[]')); } catch (e) { return new Set(); }
}
function zapiszWyslane(set) { localStorage.setItem(LS_UP, JSON.stringify([...set])); }

function idyZdjec(doc) {
  const ids = [];
  for (const s of doc.sekcje || []) {
    for (const z of s.zdjecia || []) ids.push(z.id);
    for (const u of s.ustalenia || []) for (const z of (u.zdjecia || [])) ids.push(z.id);
  }
  return ids;
}

// ---- Operacje na projektach ----
export async function listaProjektow() {
  const c = klient(); if (!c) return [];
  const { data, error } = await c.from('protokoly')
    .select('id,nazwa,adres,protokol_nr,updated_at').order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id, nazwa: r.nazwa, adres: r.adres, protokolNr: r.protokol_nr, zmodyfikowano: r.updated_at,
  }));
}

export async function wczytajProjekt(id, { onPostep } = {}) {
  const c = klient(); if (!c) throw new Error('Brak połączenia z chmurą.');
  const { data, error } = await c.from('protokoly').select('dane').eq('id', id).single();
  if (error) throw error;
  const doc = data.dane;
  const ids = idyZdjec(doc);
  const set = wyslaneSet();
  let i = 0;
  for (const zid of ids) {
    i += 1;
    const { data: blob, error: e2 } = await c.storage.from('zdjecia').download(`${zid}.jpg`);
    if (!e2 && blob) { await zapiszZdjecie(zid, blob); set.add(zid); }
    if (onPostep) onPostep(`Pobieranie zdjęć: ${i}/${ids.length}`);
  }
  zapiszWyslane(set);
  return doc;
}

export async function zapiszProjekt(doc, { onPostep } = {}) {
  const c = klient(); if (!c || !sesja) return;
  // 1) wyślij brakujące zdjęcia
  const set = wyslaneSet();
  const ids = idyZdjec(doc);
  let wys = 0;
  for (const zid of ids) {
    if (set.has(zid)) continue;
    const blob = await wczytajZdjecie(zid);
    if (!blob) continue;
    const { error } = await c.storage.from('zdjecia').upload(`${zid}.jpg`, blob, { upsert: true, contentType: 'image/jpeg' });
    if (!error) { set.add(zid); wys += 1; if (onPostep) onPostep(`Wysyłanie zdjęć: ${wys}`); }
  }
  zapiszWyslane(set);
  // 2) upsert dokumentu
  const wiersz = {
    id: doc.id,
    nazwa: doc.nazwa || '',
    adres: (doc.meta && doc.meta.adres) || '',
    protokol_nr: (doc.meta && doc.meta.protokolNr) || '',
    dane: doc,
    updated_at: new Date().toISOString(),
  };
  const { error } = await c.from('protokoly').upsert(wiersz);
  if (error) throw error;
}

export async function usunProjekt(id) {
  const c = klient(); if (!c) return;
  await c.from('protokoly').delete().eq('id', id);
}
