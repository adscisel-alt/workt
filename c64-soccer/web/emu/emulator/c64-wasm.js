/**
 * Low-level wrapper around the C64 WebAssembly binary (Emscripten-compiled)
 *
 * Responsibilities:
 * - Fetch and instantiate the WASM binary
 * - Provide the Emscripten/WASI imports the binary requires
 * - Manage WebAssembly.Memory and keep heap views up to date
 * - Forward raw WASM export calls to C64Emulator
 *
 * NOT responsible for: game logic, input handling, frame loop, or UI.
 * Consumers should use C64Emulator, not this class directly.
 */
export class C64WASM {
    /** Raw WASM exports — available to C64Emulator */
    exports = null;
    /** Typed views into WASM linear memory */
    heap = null;
    wasmMemory = null;
    // ---------------------------------------------------------------------------
    // Bootstrap
    // ---------------------------------------------------------------------------
    /**
     * Fetch, instantiate and initialise the WASM binary.
     * C64Emulator calls this via the static C64Emulator.load() factory.
     */
    static async load(wasmUrl = '/src/emulator/c64.wasm') {
        const response = await fetch(wasmUrl);
        if (!response.ok)
            throw new Error(`Failed to fetch ${wasmUrl}: ${response.status}`);
        const binary = await response.arrayBuffer();
        const instance = new C64WASM();
        await instance.instantiate(binary);
        return instance;
    }
    // Emscripten layout constants (must match the compiled binary)
    static DYNAMICTOP_PTR = 5583504;
    static DYNAMIC_BASE = 10826544;
    static INITIAL_PAGES = 256; // 16 MB
    async instantiate(wasmBinary, extraEnv) {
        const mem = new WebAssembly.Memory({ initial: C64WASM.INITIAL_PAGES });
        this.wasmMemory = mem;
        const importObject = {
            env: { ...this.makeEnvImports(mem), ...(extraEnv ?? {}) },
            wasi_snapshot_preview1: this.makeWasiImports(mem),
        };
        try {
            const result = await WebAssembly.instantiate(wasmBinary, importObject);
            this.exports = result.instance.exports;
            this.updateHeapViews();
            // Initialise the sbrk heap pointer so malloc knows where free memory starts
            new DataView(mem.buffer).setUint32(C64WASM.DYNAMICTOP_PTR, C64WASM.DYNAMIC_BASE, true);
            this.exports.__wasm_call_ctors();
        }
        catch (err) {
            throw new Error(`WASM instantiation failed: ${err}`, { cause: err });
        }
    }
    // ---------------------------------------------------------------------------
    // Memory
    // ---------------------------------------------------------------------------
    /** Allocate a buffer in WASM heap, write data, return pointer */
    allocAndWrite(data) {
        if (!this.exports || !this.heap)
            throw new Error('WASM not ready');
        const ptr = this.exports.malloc(data.length);
        // malloc may have grown memory, so refresh views before writing
        this.updateHeapViews();
        this.heap.heapU8.set(data, ptr);
        return ptr;
    }
    free(ptr) {
        this.exports?.free(ptr);
    }
    /** Refresh heap views — must be called after any memory.grow() */
    updateHeapViews() {
        if (!this.wasmMemory)
            throw new Error('WASM memory not initialized');
        const buffer = this.wasmMemory.buffer;
        this.heap = {
            heapU8: new Uint8Array(buffer),
            heapF32: new Float32Array(buffer),
            heapU32: new Uint32Array(buffer),
        };
    }
    // ---------------------------------------------------------------------------
    // Emscripten env imports
    // ---------------------------------------------------------------------------
    makeEnvImports(mem) {
        return {
            memory: mem,
            emscripten_get_sbrk_ptr: () => C64WASM.DYNAMICTOP_PTR,
            emscripten_resize_heap: (requestedSize) => {
                const PAGE_MULTIPLE = 65536;
                const maxHeapSize = 2147483648 - PAGE_MULTIPLE;
                if (requestedSize > maxHeapSize)
                    return 0;
                const oldSize = mem.buffer.byteLength;
                const minHeapSize = 16777216;
                for (let cutDown = 1; cutDown <= 4; cutDown *= 2) {
                    let overGrown = oldSize * (1 + 0.2 / cutDown);
                    overGrown = Math.min(overGrown, requestedSize + 100663296);
                    const newSize = Math.min(maxHeapSize, Math.ceil(Math.max(minHeapSize, requestedSize, overGrown) / PAGE_MULTIPLE) *
                        PAGE_MULTIPLE);
                    try {
                        mem.grow((newSize - mem.buffer.byteLength + 65535) >>> 16);
                        this.updateHeapViews();
                        return 1;
                    }
                    catch {
                        // retry with less aggressive growth
                    }
                }
                return 0;
            },
            emscripten_memcpy_big: (dest, src, num) => {
                new Uint8Array(mem.buffer).copyWithin(dest, src, src + num);
                return dest;
            },
            setTempRet0: (_val) => { },
            emscripten_asm_const_iii: (_code, _sig, _val) => 0,
            table: new WebAssembly.Table({ initial: 512, maximum: 512, element: 'anyfunc' }),
        };
    }
    // ---------------------------------------------------------------------------
    // WASI imports (only fd_write is used by this binary)
    // ---------------------------------------------------------------------------
    makeWasiImports(mem) {
        return {
            fd_write: (fd, iovs, iovs_len, nwritten) => {
                const view = new DataView(mem.buffer);
                const u8 = new Uint8Array(mem.buffer);
                let written = 0;
                for (let i = 0; i < iovs_len; i++) {
                    const ptr = view.getUint32(iovs + i * 8, true);
                    const len = view.getUint32(iovs + i * 8 + 4, true);
                    // Only forward stderr (fd 2) to the console — stdout (fd 1) is
                    // extremely noisy (SID dumps buffer length every frame).
                    if (fd === 2) {
                        const text = new TextDecoder().decode(u8.subarray(ptr, ptr + len));
                        console.error(text);
                    }
                    written += len;
                }
                view.setUint32(nwritten, written, true);
                return 0;
            },
        };
    }
}
