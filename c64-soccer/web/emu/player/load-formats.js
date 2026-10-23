export const LOAD_FORMAT_OPTIONS = [
    { type: 'crt', label: 'Cartridge (.crt)', extensions: ['.crt'] },
    { type: 'prg', label: 'Program (.prg)', extensions: ['.prg'] },
    { type: 'd64', label: 'Disk image (.d64)', extensions: ['.d64'] },
    {
        type: 'snapshot',
        label: 'Snapshot (.snapshot, .c64, .s64)',
        extensions: ['.snapshot', '.c64', '.s64'],
    },
];
const LOAD_TYPE_SET = new Set(LOAD_FORMAT_OPTIONS.map((f) => f.type));
export function isSupportedLoadType(value) {
    return typeof value === 'string' && LOAD_TYPE_SET.has(value);
}
export function inferLoadTypeFromFilename(filename) {
    const lower = filename.toLowerCase();
    for (const format of LOAD_FORMAT_OPTIONS) {
        if (format.extensions.some((ext) => lower.endsWith(ext))) {
            return format.type;
        }
    }
    return null;
}
export function resolveLoadTypeSelection(selection, filename, fallback = 'crt') {
    if (selection !== 'auto')
        return selection;
    return inferLoadTypeFromFilename(filename) ?? fallback;
}
export function getAcceptForLoadTypeSelection(selection) {
    const exts = selection === 'auto'
        ? LOAD_FORMAT_OPTIONS.flatMap((f) => f.extensions)
        : (LOAD_FORMAT_OPTIONS.find((f) => f.type === selection)?.extensions ?? []);
    return exts.join(',');
}
export function getLoadTypeLabel(type) {
    return LOAD_FORMAT_OPTIONS.find((f) => f.type === type)?.label ?? type.toUpperCase();
}
