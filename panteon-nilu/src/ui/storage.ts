// Zapisy w przeglądarce (localStorage). Każdy dostęp w try/catch — prywatne okno lub zablokowane
// dane strony nie mogą wywrócić gry; wtedy zostaje eksport/import pliku.
const KEY = 'panteon-nilu:zapisy';

export interface StoredSave {
  id: string;
  name: string;
  savedAt: string;
  data: string;
}

export function listSaves(): StoredSave[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredSave[]) : [];
  } catch {
    return [];
  }
}

export function storeSave(save: StoredSave): boolean {
  try {
    const rest = listSaves().filter((s) => s.id !== save.id);
    localStorage.setItem(KEY, JSON.stringify([save, ...rest].slice(0, 20)));
    return true;
  } catch {
    return false;
  }
}

export function deleteSave(id: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(listSaves().filter((s) => s.id !== id)));
  } catch {
    /* brak dostępu do pamięci przeglądarki — nic do usunięcia */
  }
}

/** Pobranie zapisu jako pliku .json. */
export function downloadSave(name: string, data: string): void {
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[^\p{L}\p{N}_-]+/gu, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
