import { EmulatorInput } from '../emulator/input.js';
export default class InputHandler {
    emulatorInput;
    options;
    // capture-phase blockers
    captureKeyDown = (e) => this.onCaptureKeyDown(e);
    captureKeyUp = (e) => this.onCaptureKeyUp(e);
    constructor(emulator, target = window, options = {}) {
        this.emulatorInput = new EmulatorInput(emulator, target);
        this.options = options;
    }
    attach() {
        // Install capture-phase listeners to block input when UI is open or tab unfocused
        window.addEventListener('keydown', this.captureKeyDown, true);
        window.addEventListener('keyup', this.captureKeyUp, true);
        this.emulatorInput.attach();
    }
    detach() {
        window.removeEventListener('keydown', this.captureKeyDown, true);
        window.removeEventListener('keyup', this.captureKeyUp, true);
        this.emulatorInput.detach();
    }
    /** Change which joystick port keyboard input maps to (1 or 2) */
    setKeyboardJoystickPort(port) {
        this.emulatorInput.setKeyboardPort(port);
    }
    /** Change which keyboard codes map to joystick controls. */
    setKeyboardJoystickMap(map) {
        this.emulatorInput.setKeyboardJoystickMap(map);
    }
    /** Change the input mode ('joystick' | 'keyboard' | 'mixed') */
    setInputMode(mode) {
        this.emulatorInput.setInputMode(mode);
    }
    getInputMode() {
        return this.emulatorInput.getInputMode();
    }
    setActiveGamepadIndex(index) {
        this.emulatorInput.setActiveGamepadIndex(index);
    }
    getActiveGamepadIndex() {
        return this.emulatorInput.getActiveGamepadIndex();
    }
    setGamepadMapping(mapping) {
        this.emulatorInput.setGamepadMapping(mapping);
    }
    getGamepadMapping() {
        return this.emulatorInput.getGamepadMapping();
    }
    setVirtualGamepadState(state) {
        this.emulatorInput.setVirtualGamepadState(state);
    }
    onCaptureKeyDown(e) {
        if (isEditableEventTarget(e.target))
            return;
        if (this.handleFastForwardShortcut(e))
            return;
        // Block joystick-mapped keys (standard + mixed mode) when overlays are
        // visible or the document is unfocused. Use the union of both key sets.
        if (!this.isJoystickKey(e))
            return;
        // Block if document is unfocused. Prefer the Visibility API (document.hidden)
        // which is stable under JSDOM; fall back to hasFocus() only if hidden is unavailable.
        // NOTE: We cast `document` to `Document` when checking `hasFocus` so TypeScript
        // understands the property exists at runtime. In some test environments (JSDOM)
        // the DOM typing may be looser or mocked; the cast keeps the code typed while
        // still allowing tests to override `document.hidden` or provide a `hasFocus`
        // implementation. We still prefer `document.hidden` when present.
        try {
            if (typeof document !== 'undefined') {
                if ('hidden' in document) {
                    if (document.hidden) {
                        e.stopImmediatePropagation();
                        return;
                    }
                }
                else if (typeof document.hasFocus === 'function' &&
                    !document.hasFocus()) {
                    e.stopImmediatePropagation();
                    return;
                }
            }
        }
        catch {
            // ignore DOM errors
        }
        // Block if UI overlays are visible
        try {
            if (typeof document !== 'undefined') {
                if (document.querySelector('.c64-help-overlay.visible') ||
                    document.querySelector('.c64-menu-overlay.visible')) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    return;
                }
            }
        }
        catch {
            // ignore DOM errors
        }
    }
    onCaptureKeyUp(e) {
        if (isEditableEventTarget(e.target))
            return;
        // Only block joystick-mapped keys (standard + mixed mode)
        if (!this.isJoystickKey(e))
            return;
        // Mirror the same blocking logic for keyup events
        try {
            if (typeof document !== 'undefined') {
                if ('hidden' in document) {
                    if (document.hidden) {
                        e.stopImmediatePropagation();
                        return;
                    }
                }
                else if (typeof document.hasFocus === 'function' &&
                    !document.hasFocus()) {
                    e.stopImmediatePropagation();
                    return;
                }
                if (document.querySelector('.c64-help-overlay.visible') ||
                    document.querySelector('.c64-menu-overlay.visible')) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    return;
                }
            }
        }
        catch {
            // ignore DOM errors
        }
    }
    isJoystickKey(e) {
        return this.emulatorInput.isJoystickKeyCode(e.code);
    }
    handleFastForwardShortcut(e) {
        if (!e.altKey || e.ctrlKey || e.metaKey || e.repeat)
            return false;
        const increase = e.key === '+' || e.key === '=' || e.code === 'Equal';
        const decrease = e.key === '-' || e.code === 'Minus';
        const reset = e.key === 'Backspace' || e.code === 'Backspace';
        if (!increase && !decrease && !reset)
            return false;
        if (increase)
            this.options.onFastForwardIncrease?.();
        else if (decrease)
            this.options.onFastForwardDecrease?.();
        else
            this.options.onFastForwardReset?.();
        e.preventDefault();
        e.stopImmediatePropagation();
        return true;
    }
}
function isEditableEventTarget(target) {
    if (!(target instanceof Element))
        return false;
    if (target instanceof HTMLInputElement) {
        return target.type !== 'button' && target.type !== 'checkbox' && target.type !== 'radio';
    }
    return (target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable));
}
