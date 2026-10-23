import { JOYSTICK_DIRECTION, JOYSTICK_FIRE_1, JOYSTICK_FIRE_2, JOYSTICK_FIRE_3, JOYSTICK_PORT_2, } from './constants.js';
import { C64_KEY } from './c64-keys.js';
import { GAMEPAD_BUTTONS, GAMEPAD_DIRECTIONS, outputId, readGamepadState, resolveGamepadMapping, resolveOutputs, restrictDirections, } from './gamepad-mapping.js';
export const KEY_TO_JOYSTICK = {
    ArrowUp: JOYSTICK_DIRECTION.UP,
    ArrowDown: JOYSTICK_DIRECTION.DOWN,
    ArrowLeft: JOYSTICK_DIRECTION.LEFT,
    ArrowRight: JOYSTICK_DIRECTION.RIGHT,
    ControlLeft: JOYSTICK_FIRE_1,
};
/**
 * Array of keyboard codes that map to joystick inputs. Exported so
 * external UI/input handlers can derive their blocking behavior from
 * the same canonical mapping used by the emulator.
 */
export const JOYSTICK_KEY_CODES = Object.keys(KEY_TO_JOYSTICK);
/**
 * Mixed-mode joystick key set: arrows + Z (fire alternative) + ControlLeft.
 * These keys are consumed as joystick inputs and NOT forwarded to the
 * C64 keyboard matrix in mixed mode.
 */
export const MIXED_JOYSTICK_KEYS = {
    ArrowUp: JOYSTICK_DIRECTION.UP,
    ArrowDown: JOYSTICK_DIRECTION.DOWN,
    ArrowLeft: JOYSTICK_DIRECTION.LEFT,
    ArrowRight: JOYSTICK_DIRECTION.RIGHT,
    KeyZ: JOYSTICK_FIRE_1,
    KeyX: JOYSTICK_FIRE_2,
    KeyC: JOYSTICK_FIRE_3,
    ControlLeft: JOYSTICK_FIRE_1,
};
const DEFAULT_MIXED_EXTRA_JOYSTICK_KEYS = {
    KeyX: JOYSTICK_FIRE_2,
    KeyC: JOYSTICK_FIRE_3,
};
// ---------------------------------------------------------------------------
// Browser keyboard → C64 matrix index mapping
// Mirrors src/headless/c64-key-map.mjs so the browser player can send
// typed characters to the C64 keyboard matrix.
// ---------------------------------------------------------------------------
export { C64_KEY } from './c64-keys.js';
/**
 * Translate a browser KeyboardEvent into a sequence of C64 matrix actions.
 * Returns an empty array for unmapped / ignored keys.
 */
export function domKeyToC64Actions(domKey, shiftKey, eventType) {
    const k = domKey.toLowerCase();
    const isDown = eventType === 'keydown';
    const actions = [];
    const press = (idx) => actions.push({ key: idx, action: 'press' });
    const release = (idx) => actions.push({ key: idx, action: 'release' });
    const main = (idx) => actions.push({ key: idx, action: isDown ? 'press' : 'release' });
    // Handle host shift state first for plain alpha/numeric keys
    if (isDown) {
        if (shiftKey) {
            press(C64_KEY.SHIFT_LEFT);
        }
        else {
            if (k !== 'arrowup' && k !== 'arrowleft') {
                release(C64_KEY.SHIFT_LEFT);
                release(C64_KEY.SHIFT_RIGHT);
            }
        }
    }
    switch (k) {
        // ── Letters ─────────────────────────────────────────────────────────────
        case 'a':
            main(C64_KEY.A);
            break;
        case 'b':
            main(C64_KEY.B);
            break;
        case 'c':
            main(C64_KEY.C);
            break;
        case 'd':
            main(C64_KEY.D);
            break;
        case 'e':
            main(C64_KEY.E);
            break;
        case 'f':
            main(C64_KEY.F);
            break;
        case 'g':
            main(C64_KEY.G);
            break;
        case 'h':
            main(C64_KEY.H);
            break;
        case 'i':
            main(C64_KEY.I);
            break;
        case 'j':
            main(C64_KEY.J);
            break;
        case 'k':
            main(C64_KEY.K);
            break;
        case 'l':
            main(C64_KEY.L);
            break;
        case 'm':
            main(C64_KEY.M);
            break;
        case 'n':
            main(C64_KEY.N);
            break;
        case 'o':
            main(C64_KEY.O);
            break;
        case 'p':
            main(C64_KEY.P);
            break;
        case 'q':
            main(C64_KEY.Q);
            break;
        case 'r':
            main(C64_KEY.R);
            break;
        case 's':
            main(C64_KEY.S);
            break;
        case 't':
            main(C64_KEY.T);
            break;
        case 'u':
            main(C64_KEY.U);
            break;
        case 'v':
            main(C64_KEY.V);
            break;
        case 'w':
            main(C64_KEY.W);
            break;
        case 'x':
            main(C64_KEY.X);
            break;
        case 'y':
            main(C64_KEY.Y);
            break;
        case 'z':
            main(C64_KEY.Z);
            break;
        // ── Numbers ──────────────────────────────────────────────────────────────
        case '0':
            main(C64_KEY.ZERO);
            break;
        case '1':
            main(C64_KEY.ONE);
            break;
        case '2':
            main(C64_KEY.TWO);
            break;
        case '3':
            main(C64_KEY.THREE);
            break;
        case '4':
            main(C64_KEY.FOUR);
            break;
        case '5':
            main(C64_KEY.FIVE);
            break;
        case '6':
            main(C64_KEY.SIX);
            break;
        case '7':
            main(C64_KEY.SEVEN);
            break;
        case '8':
            main(C64_KEY.EIGHT);
            break;
        case '9':
            main(C64_KEY.NINE);
            break;
        // ── Shifted number row ───────────────────────────────────────────────────
        case '!':
            if (isDown)
                press(C64_KEY.SHIFT_LEFT);
            else
                release(C64_KEY.SHIFT_LEFT);
            main(C64_KEY.ONE);
            break;
        case '"':
            if (isDown)
                press(C64_KEY.SHIFT_LEFT);
            else
                release(C64_KEY.SHIFT_LEFT);
            main(C64_KEY.TWO);
            break;
        case '#':
            if (isDown)
                press(C64_KEY.SHIFT_LEFT);
            else
                release(C64_KEY.SHIFT_LEFT);
            main(C64_KEY.THREE);
            break;
        case '$':
            if (isDown)
                press(C64_KEY.SHIFT_LEFT);
            else
                release(C64_KEY.SHIFT_LEFT);
            main(C64_KEY.FOUR);
            break;
        case '%':
            if (isDown)
                press(C64_KEY.SHIFT_LEFT);
            else
                release(C64_KEY.SHIFT_LEFT);
            main(C64_KEY.FIVE);
            break;
        case '&':
            if (isDown)
                press(C64_KEY.SHIFT_LEFT);
            else
                release(C64_KEY.SHIFT_LEFT);
            main(C64_KEY.SIX);
            break;
        case "'":
            if (isDown)
                press(C64_KEY.SHIFT_LEFT);
            else
                release(C64_KEY.SHIFT_LEFT);
            main(C64_KEY.SEVEN);
            break;
        case '(':
            if (isDown)
                press(C64_KEY.SHIFT_LEFT);
            else
                release(C64_KEY.SHIFT_LEFT);
            main(C64_KEY.EIGHT);
            break;
        case ')':
            if (isDown)
                press(C64_KEY.SHIFT_LEFT);
            else
                release(C64_KEY.SHIFT_LEFT);
            main(C64_KEY.NINE);
            break;
        // ── Symbols ──────────────────────────────────────────────────────────────
        case ' ':
            main(C64_KEY.SPACE);
            break;
        case 'enter':
            main(C64_KEY.RETURN);
            break;
        case 'backspace':
        case 'delete':
            main(C64_KEY.INS_DEL);
            break;
        case 'escape':
            main(C64_KEY.RUN_STOP);
            break;
        case '-':
            main(C64_KEY.MINUS);
            break;
        case '=':
            main(C64_KEY.EQUALS);
            break;
        case '+':
            if (isDown) {
                release(C64_KEY.SHIFT_LEFT);
                release(C64_KEY.SHIFT_RIGHT);
            }
            main(C64_KEY.PLUS);
            break;
        case '*':
            if (isDown) {
                release(C64_KEY.SHIFT_LEFT);
                release(C64_KEY.SHIFT_RIGHT);
            }
            main(C64_KEY.STAR);
            break;
        case '@':
            if (isDown) {
                release(C64_KEY.SHIFT_LEFT);
                release(C64_KEY.SHIFT_RIGHT);
            }
            main(C64_KEY.AT);
            break;
        case '^':
            if (isDown) {
                release(C64_KEY.SHIFT_LEFT);
                release(C64_KEY.SHIFT_RIGHT);
            }
            main(C64_KEY.ARROW_UP);
            break;
        case '`':
            main(C64_KEY.ARROW_LEFT);
            break;
        case '~':
            main(C64_KEY.ARROW_UP);
            break;
        case '\\':
            main(C64_KEY.POUND);
            break;
        case ',':
        case '<':
            main(C64_KEY.COMMA);
            break;
        case '.':
        case '>':
            main(C64_KEY.PERIOD);
            break;
        case '/':
        case '?':
            main(C64_KEY.SLASH);
            break;
        case ';':
            main(C64_KEY.SEMICOLON);
            break;
        case ':':
            if (isDown) {
                release(C64_KEY.SHIFT_LEFT);
                release(C64_KEY.SHIFT_RIGHT);
            }
            main(C64_KEY.COLON);
            break;
        case '[':
            if (isDown)
                press(C64_KEY.SHIFT_LEFT);
            else
                release(C64_KEY.SHIFT_LEFT);
            main(C64_KEY.COLON);
            break;
        case ']':
            if (isDown)
                press(C64_KEY.SHIFT_LEFT);
            else
                release(C64_KEY.SHIFT_LEFT);
            main(C64_KEY.SEMICOLON);
            break;
        // ── Modifier / special keys ───────────────────────────────────────────────
        case 'shift':
            main(C64_KEY.SHIFT_LEFT);
            break;
        case 'tab':
            main(C64_KEY.CTRL);
            break;
        case 'control':
            main(C64_KEY.COMMODORE);
            break;
        case 'capslock':
            main(C64_KEY.COMMODORE);
            break;
        case 'home':
            main(C64_KEY.CLEAR_HOME);
            break;
        case 'pageup':
            main(C64_KEY.RESTORE);
            break;
        // ── Function keys ────────────────────────────────────────────────────────
        case 'f1':
            main(C64_KEY.F1);
            break;
        case 'f2':
            if (isDown)
                press(C64_KEY.SHIFT_LEFT);
            else
                release(C64_KEY.SHIFT_LEFT);
            main(C64_KEY.F1);
            break;
        case 'f3':
            main(C64_KEY.F3);
            break;
        case 'f4':
            if (isDown)
                press(C64_KEY.SHIFT_LEFT);
            else
                release(C64_KEY.SHIFT_LEFT);
            main(C64_KEY.F3);
            break;
        case 'f5':
            main(C64_KEY.F5);
            break;
        case 'f6':
            if (isDown)
                press(C64_KEY.SHIFT_LEFT);
            else
                release(C64_KEY.SHIFT_LEFT);
            main(C64_KEY.F5);
            break;
        case 'f7':
            main(C64_KEY.F7);
            break;
        case 'f8':
            if (isDown)
                press(C64_KEY.SHIFT_LEFT);
            else
                release(C64_KEY.SHIFT_LEFT);
            main(C64_KEY.F7);
            break;
        // ── Cursor keys ───────────────────────────────────────────────────────────
        // Down/Right are unshifted; Up/Left use Shift+cursor.
        case 'arrowdown':
            main(C64_KEY.CURSOR_UP_DOWN);
            break;
        case 'arrowup':
            if (isDown)
                press(C64_KEY.SHIFT_LEFT);
            else
                release(C64_KEY.SHIFT_LEFT);
            main(C64_KEY.CURSOR_UP_DOWN);
            break;
        case 'arrowright':
            main(C64_KEY.CURSOR_LEFT_RIGHT);
            break;
        case 'arrowleft':
            if (isDown)
                press(C64_KEY.SHIFT_LEFT);
            else
                release(C64_KEY.SHIFT_LEFT);
            main(C64_KEY.CURSOR_LEFT_RIGHT);
            break;
        default:
            break;
    }
    return actions;
}
const POT_INACTIVE = 128;
const POT_ACTIVE = 0;
export class EmulatorInput {
    emulator;
    target;
    // Which joystick port keyboard events map to (1 or 2). Default is port 2.
    joystickPort;
    inputMode = 'mixed';
    updateFrame = -1;
    gamepadIndex = -1;
    gamepadMapping = resolveGamepadMapping();
    // Controls held on the physical gamepad (plus Start) and on a virtual one, e.g. on-screen touch controls
    physicalGamepadState = {};
    virtualGamepadState = {};
    // Directions after the stick mode was applied, so 4-way can keep the one already held
    heldGamepadDirections = {};
    // Emulator inputs currently held because of the gamepads, by outputId()
    heldGamepadOutputs = new Map();
    keyboardJoystickMap = { ...KEY_TO_JOYSTICK };
    mixedJoystickMap = { ...MIXED_JOYSTICK_KEYS };
    potFire2Pressed = false;
    potFire3Pressed = false;
    pressedControls = new Set();
    keyDownHandler = (event) => {
        this.handleKeyDown(event);
    };
    keyUpHandler = (event) => {
        this.handleKeyUp(event);
    };
    gamepadConnectedHandler = (event) => {
        this.handleGamepadConnected(event);
    };
    gamepadDisconnectedHandler = (event) => {
        this.handleGamepadDisconnected(event);
    };
    constructor(emulator, target = window, defaultPort = JOYSTICK_PORT_2) {
        this.emulator = emulator;
        this.target = target;
        this.joystickPort = defaultPort;
    }
    attach() {
        this.target.addEventListener('gamepadconnected', this.gamepadConnectedHandler);
        this.target.addEventListener('gamepaddisconnected', this.gamepadDisconnectedHandler);
        this.target.addEventListener('keydown', this.keyDownHandler);
        this.target.addEventListener('keyup', this.keyUpHandler);
    }
    detach() {
        this.target.removeEventListener('gamepadconnected', this.gamepadConnectedHandler);
        this.target.removeEventListener('gamepaddisconnected', this.gamepadDisconnectedHandler);
        this.target.removeEventListener('keydown', this.keyDownHandler);
        this.target.removeEventListener('keyup', this.keyUpHandler);
        this.releaseAll();
        this.releaseAllGamepadButtons();
        this.cancelUpdate();
    }
    step() {
        const gamepads = navigator.getGamepads();
        if (!gamepads) {
            return;
        }
        const gp = gamepads[this.gamepadIndex];
        if (!gp) {
            this.physicalGamepadState = {};
            this.applyGamepadState();
            this.cancelUpdate();
            return;
        }
        this.physicalGamepadState = readGamepadState(gp);
        this.applyGamepadState();
        this.updateFrame = requestAnimationFrame(this.step.bind(this));
    }
    /** Holds exactly the emulator inputs that the physical and virtual gamepads map to right now */
    applyGamepadState() {
        const physical = this.physicalGamepadState;
        const virtual = this.virtualGamepadState;
        const combined = {};
        for (const control of [...GAMEPAD_DIRECTIONS, ...GAMEPAD_BUTTONS]) {
            combined[control] = !!physical[control] || !!virtual[control];
        }
        const directions = restrictDirections(combined, this.gamepadMapping.stick, this.heldGamepadDirections);
        this.heldGamepadDirections = directions;
        const outputs = resolveOutputs({ ...combined, ...directions }, this.gamepadMapping);
        // Start is always RUN/STOP
        if (physical.start)
            outputs.set(outputId({ key: C64_KEY.RUN_STOP }), { key: C64_KEY.RUN_STOP });
        for (const [id, output] of this.heldGamepadOutputs) {
            if (!outputs.has(id))
                this.releaseGamepadOutput(output);
        }
        for (const [id, output] of outputs) {
            if (!this.heldGamepadOutputs.has(id))
                this.pushGamepadOutput(output);
        }
        this.heldGamepadOutputs = outputs;
    }
    pushGamepadOutput(output) {
        if ('joystick' in output)
            this.emulator.joystickPush(this.joystickPort, output.joystick);
        else
            this.emulator.keyDown(output.key);
    }
    releaseGamepadOutput(output) {
        if ('joystick' in output)
            this.emulator.joystickRelease(this.joystickPort, output.joystick);
        else
            this.emulator.keyUp(output.key);
    }
    cancelUpdate() {
        cancelAnimationFrame(this.updateFrame);
        this.updateFrame = -1;
        this.gamepadIndex = -1;
    }
    /** Lets go of everything the gamepads hold, physical and virtual */
    releaseAllGamepadButtons() {
        this.physicalGamepadState = {};
        this.virtualGamepadState = {};
        this.heldGamepadDirections = {};
        for (const output of this.heldGamepadOutputs.values())
            this.releaseGamepadOutput(output);
        this.heldGamepadOutputs = new Map();
    }
    findConnectedGamepadIndex(excludeIndex) {
        const gamepads = navigator.getGamepads?.() ?? [];
        for (const gamepad of gamepads) {
            if (!gamepad)
                continue;
            if (gamepad.index === excludeIndex)
                continue;
            return gamepad.index;
        }
        return -1;
    }
    handleGamepadDisconnected(event) {
        console.log('Gamepad disconnected from index %d: %s', event.gamepad.index, event.gamepad.id);
        const wasActive = this.gamepadIndex === event.gamepad.index;
        if (wasActive) {
            this.releaseAllGamepadButtons();
            const fallbackIndex = this.findConnectedGamepadIndex(event.gamepad.index);
            if (fallbackIndex >= 0) {
                this.gamepadIndex = fallbackIndex;
                if (this.updateFrame < 0) {
                    this.step();
                }
            }
            else {
                this.cancelUpdate();
            }
        }
        const gamepadDisconnected = new CustomEvent('c64-controller-disconnected', {
            detail: {
                name: event.gamepad.id,
                index: event.gamepad.index,
            },
        });
        this.target.dispatchEvent(gamepadDisconnected);
    }
    handleGamepadConnected(event) {
        console.log('Gamepad connected at index %d: %s. %d buttons, %d axes.', event.gamepad.index, event.gamepad.id, event.gamepad.buttons.length, event.gamepad.axes.length);
        if (this.gamepadIndex < 0) {
            this.gamepadIndex = event.gamepad.index;
        }
        const gamepadConnected = new CustomEvent('c64-controller-connected', {
            detail: {
                name: event.gamepad.id,
                index: event.gamepad.index,
            },
        });
        this.target.dispatchEvent(gamepadConnected);
        if (this.updateFrame < 0) {
            this.step();
        }
    }
    handleKeyDown(event) {
        if (isEditableEventTarget(event.target))
            return;
        if (this.inputMode === 'keyboard') {
            // Pure keyboard mode — all keys go to C64 matrix, no joystick
            const acts = domKeyToC64Actions(event.key, event.shiftKey, 'keydown');
            if (acts.length > 0) {
                for (const act of acts) {
                    if (act.action === 'press')
                        this.emulator.keyDown(act.key);
                    else
                        this.emulator.keyUp(act.key);
                }
                event.preventDefault();
            }
            return;
        }
        if (this.inputMode === 'mixed') {
            // Mixed mode — joystick keys (arrows + Z + ControlLeft) drive joystick;
            // all other keys route to the C64 keyboard matrix.
            if (event.code in this.mixedJoystickMap) {
                // Joystick path
                const dir = this.mixedJoystickMap[event.code];
                this.pushJoystickInput(dir);
                event.preventDefault();
            }
            else {
                // Keyboard path — but exclude the joystick codes from matrix so
                // they don't double-fire (they were handled above).
                const acts = domKeyToC64Actions(event.key, event.shiftKey, 'keydown');
                if (acts.length > 0) {
                    for (const act of acts) {
                        if (act.action === 'press')
                            this.emulator.keyDown(act.key);
                        else
                            this.emulator.keyUp(act.key);
                    }
                    event.preventDefault();
                }
            }
            return;
        }
        // Default: joystick-only mode
        const control = this.getMappedControl(event);
        if (!control || this.pressedControls.has(control)) {
            return;
        }
        this.pressedControls.add(control);
        this.pushJoystickInput(this.keyboardJoystickMap[control]);
        event.preventDefault();
    }
    handleKeyUp(event) {
        if (isEditableEventTarget(event.target))
            return;
        if (this.inputMode === 'keyboard') {
            const acts = domKeyToC64Actions(event.key, event.shiftKey, 'keyup');
            if (acts.length > 0) {
                for (const act of acts) {
                    if (act.action === 'press')
                        this.emulator.keyDown(act.key);
                    else
                        this.emulator.keyUp(act.key);
                }
                event.preventDefault();
            }
            return;
        }
        if (this.inputMode === 'mixed') {
            if (event.code in this.mixedJoystickMap) {
                const dir = this.mixedJoystickMap[event.code];
                this.releaseJoystickInput(dir);
                event.preventDefault();
            }
            else {
                const acts = domKeyToC64Actions(event.key, event.shiftKey, 'keyup');
                if (acts.length > 0) {
                    for (const act of acts) {
                        if (act.action === 'press')
                            this.emulator.keyDown(act.key);
                        else
                            this.emulator.keyUp(act.key);
                    }
                    event.preventDefault();
                }
            }
            return;
        }
        // Default: joystick-only mode
        const control = this.getMappedControl(event);
        if (!control) {
            return;
        }
        this.pressedControls.delete(control);
        this.releaseJoystickInput(this.keyboardJoystickMap[control]);
        event.preventDefault();
    }
    getMappedControl(event) {
        if (event.code in this.keyboardJoystickMap) {
            return event.code;
        }
        return null;
    }
    pushJoystickInput(input) {
        if (input === JOYSTICK_FIRE_2) {
            this.potFire2Pressed = true;
            this.syncPotFireButtons();
            return;
        }
        if (input === JOYSTICK_FIRE_3) {
            this.potFire3Pressed = true;
            this.syncPotFireButtons();
            return;
        }
        this.emulator.joystickPush(this.joystickPort, input);
    }
    releaseJoystickInput(input) {
        if (input === JOYSTICK_FIRE_2) {
            this.potFire2Pressed = false;
            this.syncPotFireButtons();
            return;
        }
        if (input === JOYSTICK_FIRE_3) {
            this.potFire3Pressed = false;
            this.syncPotFireButtons();
            return;
        }
        this.emulator.joystickRelease(this.joystickPort, input);
    }
    releaseAll() {
        for (const control of this.pressedControls) {
            this.releaseJoystickInput(this.keyboardJoystickMap[control]);
        }
        this.pressedControls.clear();
        this.potFire2Pressed = false;
        this.potFire3Pressed = false;
        this.syncPotFireButtons();
    }
    syncPotFireButtons() {
        if (!this.potFire2Pressed && !this.potFire3Pressed) {
            this.emulator.setMousePortEnabled?.(this.joystickPort, false);
            return;
        }
        this.emulator.setMousePortEnabled?.(this.joystickPort, true);
        this.emulator.mousePosition?.(this.potFire2Pressed ? POT_ACTIVE : POT_INACTIVE, this.potFire3Pressed ? POT_ACTIVE : POT_INACTIVE);
    }
    /** Set which joystick port keyboard controls should target (1 or 2). */
    setKeyboardPort(port) {
        if (this.joystickPort === port)
            return;
        this.releaseAll();
        this.releaseAllGamepadButtons();
        this.joystickPort = port;
    }
    /** Set the input mode. Releases any held joystick buttons on mode change. */
    setInputMode(mode) {
        if (this.inputMode === mode)
            return;
        this.releaseAll();
        this.releaseAllGamepadButtons();
        this.inputMode = mode;
    }
    getInputMode() {
        return this.inputMode;
    }
    /** Replace the keyboard-code to joystick-input map used in joystick and mixed modes. */
    setKeyboardJoystickMap(map) {
        this.releaseAll();
        this.keyboardJoystickMap = { ...map };
        this.mixedJoystickMap = { ...map, ...DEFAULT_MIXED_EXTRA_JOYSTICK_KEYS };
    }
    isJoystickKeyCode(code) {
        return code in this.keyboardJoystickMap || code in this.mixedJoystickMap;
    }
    setActiveGamepadIndex(index) {
        if (this.gamepadIndex === index)
            return;
        const gamepads = navigator.getGamepads?.() ?? [];
        const nextGamepad = gamepads[index];
        if (!nextGamepad) {
            throw new Error(`Gamepad ${index} is not connected`);
        }
        this.releaseAllGamepadButtons();
        this.gamepadIndex = index;
        if (this.updateFrame < 0) {
            this.step();
        }
    }
    getActiveGamepadIndex() {
        return this.gamepadIndex;
    }
    /**
     * Changes what the gamepad controls do: the stick mode, and the joystick input or C64 key for
     * each direction and button. Unlisted controls keep their defaults; null/undefined restores all
     * defaults. Applies to both the physical and the virtual gamepad.
     */
    setGamepadMapping(mapping) {
        this.gamepadMapping = resolveGamepadMapping(mapping);
        this.heldGamepadDirections = {};
        this.applyGamepadState();
    }
    getGamepadMapping() {
        return this.gamepadMapping;
    }
    /**
     * Sets the controls held on a virtual gamepad, e.g. on-screen touch controls. They go through
     * the same mapping as the physical gamepad, combined with it.
     */
    setVirtualGamepadState(state) {
        this.virtualGamepadState = { ...state };
        this.applyGamepadState();
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
