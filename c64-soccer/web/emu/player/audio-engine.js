/**
 * AudioEngine — Web Audio playback for the C64 emulator.
 *
 * Uses AudioWorkletNode (modern API, replaces deprecated ScriptProcessorNode).
 * Replicates the original c64.js audio model using a **pull** approach:
 *
 *   - The SID writes into a 4096-sample circular buffer as CPU cycles run.
 *   - The AudioWorklet processor runs on the audio thread and outputs samples
 *     from a ring buffer.  When the ring buffer runs low it posts a
 *     `'need-samples'` message back to the main thread.
 *   - The main thread reads the current SID buffer snapshot via a registered
 *     reader function and posts the samples to the worklet.
 *
 * All timing is driven by the audio hardware clock — no setInterval drift.
 *
 * Also supports:
 *   - Auto-play detection with deferred resume on user gesture
 *   - Mute / unmute
 *   - Volume control (0–1)
 */
const DEFAULT_SAMPLE_RATE = 44_100;
export class AudioEngine {
    ctx = null;
    workletNode = null;
    gainNode = null;
    _muted = false;
    _volume = 0.75;
    _suspended = true;
    _initialised = false;
    _ready = false;
    options;
    /** Called when the worklet needs more samples */
    _readSidBuffer = null;
    /** Optional callback fired whenever muted / volume / suspended state changes */
    onStateChange;
    constructor(options = {}) {
        this.options = options;
    }
    // ── Public getters ────────────────────────────────────────────────────────
    get muted() {
        return this._muted;
    }
    get volume() {
        return this._volume;
    }
    get suspended() {
        return this._suspended;
    }
    get ready() {
        return this._ready;
    }
    get sampleRate() {
        return this.ctx?.sampleRate ?? DEFAULT_SAMPLE_RATE;
    }
    // ── Init ──────────────────────────────────────────────────────────────────
    /**
     * Create the AudioContext and AudioWorklet. Returns `true` if audio is
     * playing immediately, `false` if the browser blocked autoplay.
     */
    async init() {
        if (this._initialised)
            return !this._suspended;
        this._initialised = true;
        try {
            this.ctx = new AudioContext({ sampleRate: DEFAULT_SAMPLE_RATE });
            this.gainNode = this.ctx.createGain();
            this.gainNode.gain.value = this._volume;
            this.gainNode.connect(this.ctx.destination);
            this.ctx.addEventListener('statechange', () => {
                const wasSuspended = this._suspended;
                this._suspended = this.ctx?.state === 'suspended';
                if (wasSuspended !== this._suspended) {
                    this.fireStateChange();
                    this.feedWorklet();
                }
            });
            this._suspended = this.ctx.state === 'suspended';
            await this.loadWorklet();
            // Attempt to resume (may fail due to autoplay policy)
            if (this._suspended) {
                this.ctx.resume().catch(() => { });
                this._suspended = this.ctx.state === 'suspended';
            }
            this.fireStateChange();
            return !this._suspended;
        }
        catch {
            // AudioContext unavailable (e.g. test environment) — silently degrade
            return false;
        }
    }
    async loadWorklet() {
        if (!this.ctx || !this.gainNode)
            return;
        const base = this.options.assetBaseUrl ?? '/';
        const processorUrl = this.options.workletUrl ?? `${base.replace(/\/+$/, '')}/audio-worklet-processor.js`;
        await this.ctx.audioWorklet.addModule(processorUrl);
        this.workletNode = new AudioWorkletNode(this.ctx, 'c64-audio-processor', {
            outputChannelCount: [1],
        });
        this.workletNode.connect(this.gainNode);
        // Listen for pull requests from the worklet
        this.workletNode.port.onmessage = () => {
            this.feedWorklet();
        };
        this._ready = true;
        this.feedWorklet();
    }
    // ── SID buffer reader ─────────────────────────────────────────────────────
    /**
     * Register a function that reads the current SID audio buffer.
     * The engine calls this when the worklet requests more samples.
     */
    setSidBufferReader(reader) {
        this._readSidBuffer = reader;
        this.feedWorklet();
    }
    // ── Sample feeding ────────────────────────────────────────────────────────
    /** Respond to a pull request from the worklet with fresh SID data */
    feedWorklet() {
        if (!this.workletNode || !this._readSidBuffer || this._suspended)
            return;
        const samples = this._readSidBuffer();
        if (samples && samples.length > 0) {
            this.workletNode.port.postMessage(samples);
        }
    }
    // ── Playback controls ────────────────────────────────────────────────────
    async resume() {
        if (!this.ctx)
            return;
        try {
            await this.ctx.resume();
            this._suspended = this.ctx.state === 'suspended';
            this.fireStateChange();
            this.feedWorklet();
        }
        catch (err) {
            console.error('AudioEngine: resume failed', err);
        }
    }
    setMuted(muted) {
        this._muted = muted;
        if (this.gainNode) {
            this.gainNode.gain.value = muted ? 0 : this._volume;
        }
        this.fireStateChange();
    }
    toggleMute() {
        this.setMuted(!this._muted);
    }
    setVolume(v) {
        this._volume = Math.max(0, Math.min(1, v));
        if (this.gainNode && !this._muted) {
            this.gainNode.gain.value = this._volume;
        }
        this.fireStateChange();
    }
    adjustVolume(delta) {
        this.setVolume(this._volume + delta);
    }
    // ── Teardown ──────────────────────────────────────────────────────────────
    async destroy() {
        this.workletNode?.disconnect();
        this.gainNode?.disconnect();
        await this.ctx?.close();
        this.workletNode = null;
        this.gainNode = null;
        this.ctx = null;
        this._initialised = false;
        this._ready = false;
        this._suspended = true;
        this._readSidBuffer = null;
    }
    // ── Internal ──────────────────────────────────────────────────────────────
    fireStateChange() {
        this.onStateChange?.({
            muted: this._muted,
            volume: this._volume,
            suspended: this._suspended,
        });
    }
}
