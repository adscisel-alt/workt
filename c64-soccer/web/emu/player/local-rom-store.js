import { getAcceptForLoadTypeSelection, inferLoadTypeFromFilename, isSupportedLoadType, } from './load-formats.js';
const DB_NAME = 'c64-ready-local-roms';
const STORE_NAME = 'rom-files';
const DB_VERSION = 2;
export function getCheevosRomPath(set) {
    const value = typeof set.romPath === 'string' ? set.romPath : set.rom?.path;
    return typeof value === 'string' ? value.trim() : '';
}
export function getCheevosRomType(set) {
    if (isSupportedLoadType(set.rom?.type))
        return set.rom.type;
    const romPath = getCheevosRomPath(set);
    return inferLoadTypeFromFilename(romPath) ?? undefined;
}
export async function getStoredCheevosRom(romPath, type) {
    const record = await getStoredRomRecord(romPath);
    if (!record)
        return null;
    const file = new File([record.blob], record.name, { type: record.blob.type });
    return { file, type: type ?? record.type, romPath };
}
export async function chooseAndStoreCheevosRom(romPath, type) {
    const picker = window.showOpenFilePicker;
    if (!picker)
        return null;
    const [handle] = await picker({
        multiple: false,
        types: [
            {
                description: 'C64 ROM files',
                accept: {
                    'application/octet-stream': getAcceptForLoadTypeSelection(type ?? 'auto').split(','),
                },
            },
        ],
    });
    if (!handle)
        return null;
    const file = await handle.getFile();
    await storeCheevosRomFile(romPath, file, type);
    return { file, type: type ?? inferLoadTypeFromFilename(file.name) ?? 'crt', romPath };
}
export async function storeCheevosRomFile(romPath, file, type) {
    const resolvedType = type ?? inferLoadTypeFromFilename(file.name) ?? 'crt';
    const db = await openDb();
    await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put({
            romPath,
            name: file.name,
            type: resolvedType,
            blob: file,
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Unable to store ROM file'));
    });
    db.close();
}
async function getStoredRomRecord(romPath) {
    if (typeof indexedDB === 'undefined')
        return null;
    const db = await openDb();
    const record = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).get(romPath);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Unable to read ROM file'));
    });
    db.close();
    if (!record?.blob || !record.name || !isSupportedLoadType(record.type))
        return null;
    return record;
}
function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'romPath' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Unable to open local ROM store'));
    });
}
