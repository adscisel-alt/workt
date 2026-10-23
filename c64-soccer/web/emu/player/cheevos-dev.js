const STORAGE_PREFIX = 'c64-cheevos-dev';
export class CheevosDevController {
    player;
    enabled = false;
    detectorId = '';
    cheevosSet = { cheevos: [] };
    instance = null;
    rafId = 0;
    lastSnapshotKey = '';
    constructor(player) {
        this.player = player;
    }
    getState() {
        return {
            enabled: this.enabled,
            detectorId: this.detectorId,
            cheevosSet: this.cheevosSet,
        };
    }
    async enable(detectorId, cheevosSet = { cheevos: [] }) {
        const normalisedDetectorId = detectorId.trim().toLowerCase();
        if (!normalisedDetectorId)
            throw new Error('Cheevos detector ID is required');
        this.disable();
        this.detectorId = normalisedDetectorId;
        this.cheevosSet = normaliseCheevosSet(cheevosSet, normalisedDetectorId);
        const { createCheevos } = await import('c64-cheevos');
        const poppedCheevos = this.getPoppedCheevos(normalisedDetectorId);
        const cheevos = (await createCheevos(normalisedDetectorId, {
            gameId: normalisedDetectorId,
            user: { id: 'dev-user', username: 'Developer' },
            cheevosSet: this.cheevosSet,
            poppedCheevos,
            postScore: this.postScore,
            popCheevo: this.popCheevo,
        }));
        cheevos.cpuReadNS = (addr) => this.player?.cpuReadNS(addr) ?? 0;
        cheevos.cpuRead = (addr) => this.player?.cpuRead(addr) ?? 0;
        cheevos.ramRead = (addr) => this.player?.ramRead(addr) ?? 0;
        this.attachWatcher(cheevos);
        this.instance = cheevos;
        this.enabled = true;
        this.dispatchStatus('enabled', {
            cheevosCount: this.cheevosSet.cheevos?.length ?? 0,
            cheevosSet: this.cheevosSet,
            poppedCheevos,
        });
        this.tick();
    }
    async enableFromJson(detectorId, rawJson) {
        await this.enable(detectorId, parseCheevosSetJson(rawJson));
    }
    disable() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = 0;
        }
        this.enabled = false;
        this.instance = null;
        this.lastSnapshotKey = '';
    }
    destroy() {
        this.disable();
        this.player = null;
    }
    clearPopped(detectorId = this.detectorId) {
        const id = detectorId.trim().toLowerCase();
        if (!id)
            return;
        localStorage.removeItem(getPoppedStorageKey(id));
        this.dispatchStatus('popped-cleared', { poppedCheevos: [] });
    }
    clearScores(detectorId = this.detectorId) {
        const id = detectorId.trim().toLowerCase();
        if (!id)
            return;
        localStorage.removeItem(getScoresStorageKey(id));
        this.dispatchStatus('scores-cleared');
    }
    tick = () => {
        if (!this.enabled)
            return;
        try {
            this.instance?.execute?.();
            this.dispatchSnapshot();
        }
        catch (err) {
            this.disable();
            window.dispatchEvent(new CustomEvent('c64-cheevos-error', {
                detail: { detectorId: this.detectorId, error: normaliseError(err) },
            }));
            return;
        }
        this.rafId = requestAnimationFrame(this.tick);
    };
    postScore = async (gameId, score, userId, username, variant) => {
        const entry = {
            gameId,
            score,
            userId,
            username,
            variant,
            at: new Date().toISOString(),
        };
        const scores = readJson(getScoresStorageKey(this.detectorId), []);
        scores.push(entry);
        localStorage.setItem(getScoresStorageKey(this.detectorId), JSON.stringify(scores));
        window.dispatchEvent(new CustomEvent('c64-cheevos-score', {
            detail: { detectorId: this.detectorId, score: entry },
        }));
        return { ok: true };
    };
    popCheevo = async (_cheevosSetId, _userId, cheevoId) => {
        const achievement = this.findAchievement(cheevoId) ?? {
            _id: cheevoId,
            title: cheevoId,
            description: 'Unlocked in c64-ready dev mode',
        };
        const popped = this.getPoppedCheevos(this.detectorId);
        if (!popped.some((item) => item.achievement._id === cheevoId)) {
            popped.push({ achievement });
            localStorage.setItem(getPoppedStorageKey(this.detectorId), JSON.stringify(popped));
        }
        window.dispatchEvent(new CustomEvent('c64-cheevos-popped', {
            detail: { detectorId: this.detectorId, achievement, poppedCheevos: popped },
        }));
        return { achievement };
    };
    dispatchSnapshot() {
        const instance = this.instance;
        if (!instance)
            return;
        const fields = Object.fromEntries((this.cheevosSet.trackerFields ?? []).map((field) => {
            const sourceField = field.field ?? field.key;
            return [field.key, normaliseTrackerValue(instance[sourceField])];
        }));
        const detail = {
            detectorId: this.detectorId,
            score: normaliseTrackerValue(instance.score),
            lives: normaliseTrackerValue(instance.lives),
            isGameOver: typeof instance.isGameOver === 'boolean' ? instance.isGameOver : undefined,
            fields,
        };
        const snapshotKey = JSON.stringify(detail);
        if (snapshotKey === this.lastSnapshotKey)
            return;
        this.lastSnapshotKey = snapshotKey;
        window.dispatchEvent(new CustomEvent('c64-cheevos-snapshot', { detail }));
    }
    attachWatcher(cheevos) {
        const watcher = cheevos.watcher;
        if (typeof watcher?.on !== 'function')
            return;
        for (const type of ['cheevo', 'gameOver', 'livesChange', 'newGame']) {
            watcher.on(type, (payload) => {
                const detail = { detectorId: this.detectorId, type, payload };
                window.dispatchEvent(new CustomEvent('c64-cheevos-event', { detail }));
            });
        }
    }
    findAchievement(cheevoId) {
        return this.cheevosSet.cheevos?.find((achievement) => achievement._id === cheevoId);
    }
    getPoppedCheevos(detectorId) {
        return readJson(getPoppedStorageKey(detectorId), []);
    }
    dispatchStatus(status, extra = {}) {
        window.dispatchEvent(new CustomEvent('c64-cheevos-status', {
            detail: { detectorId: this.detectorId, status, ...extra },
        }));
    }
}
export function parseCheevosSetJson(rawJson) {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Cheevos JSON must be an object');
    }
    return normaliseCheevosSet(parsed);
}
function normaliseCheevosSet(set, detectorId = 'dev') {
    const cheevos = Array.isArray(set.cheevos) ? set.cheevos : [];
    const trackerFields = Array.isArray(set.trackerFields) ? set.trackerFields : [];
    const romPath = normaliseOptionalString(set.romPath ?? set.rom?.path);
    const romType = normaliseOptionalString(set.rom?.type);
    return {
        _id: set._id ?? `${detectorId}-dev-set`,
        ...(romPath ? { romPath } : {}),
        ...(romPath || romType
            ? { rom: { ...(romPath ? { path: romPath } : {}), ...(romType ? { type: romType } : {}) } }
            : {}),
        trackerFields: trackerFields.map((field, index) => ({
            key: String(field.key ?? field.field ?? `field-${index + 1}`),
            label: field.label ? String(field.label) : undefined,
            source: 'field',
            field: field.field ? String(field.field) : undefined,
            display: field.display === 'bar' ? 'bar' : 'text',
            max: typeof field.max === 'number' && Number.isFinite(field.max) ? field.max : undefined,
        })),
        cheevos: cheevos.map((achievement, index) => ({
            _id: String(achievement._id ?? `dev-${index + 1}`),
            title: String(achievement.title ?? achievement._id ?? `Achievement ${index + 1}`),
            description: achievement.description ? String(achievement.description) : '',
        })),
    };
}
function normaliseOptionalString(value) {
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
}
function readJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    }
    catch {
        return fallback;
    }
}
function getScoresStorageKey(detectorId) {
    return `${STORAGE_PREFIX}:${detectorId}:scores`;
}
function getPoppedStorageKey(detectorId) {
    return `${STORAGE_PREFIX}:${detectorId}:popped`;
}
function normaliseError(err) {
    return err instanceof Error ? err.message : String(err);
}
function normaliseTrackerValue(value) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    return undefined;
}
export default CheevosDevController;
