// Styl ruchu („zwiastun filmowy”): trajektorie i przebiegi czasowe jako czyste funkcje czasu.
// Bez WebGL i Reacta — testowalne w Node; komponenty sceny tylko je próbkują.
import { arcPoint, easeInOutCubic, type Vec3 } from './coords';

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
/** Lekkie przestrzelenie na końcu (mniejsze niż klasyczne easeOutBack). */
const easeOutSoftBack = (t: number, c = 0.9) => {
  const x = clamp01(t) - 1;
  return 1 + (c + 1) * x * x * x + c * x * x;
};

// ---------- ruch figurki ----------

export const MOVE = {
  /** Uniesienie przed lotem (s) i jego wysokość. */
  liftTime: 0.14,
  liftHeight: 0.22,
  /** Lot łukiem: 0,6 s na sąsiednie pole, 0,9 s od trzech pól wzwyż. */
  flightMin: 0.6,
  flightMax: 0.9,
  /** Lądowanie: przysiad przy uderzeniu, potem jedno małe odbicie. */
  landTime: 0.3,
  squashShare: 0.35,
  squash: 0.86,
  bounceHeight: 0.07,
} as const;

const HEX_STEP = Math.sqrt(3); // odległość środków sąsiednich pól (TILE_R = 1)

export function flightTime(from: Vec3, to: Vec3): number {
  const hexes = Math.hypot(to[0] - from[0], to[2] - from[2]) / HEX_STEP;
  const k = clamp01((hexes - 1) / 2);
  return MOVE.flightMin + (MOVE.flightMax - MOVE.flightMin) * k;
}

/** Chwila zetknięcia z polem docelowym (s od startu) — wtedy wylatuje pył. */
export const landingTime = (from: Vec3, to: Vec3) => MOVE.liftTime + flightTime(from, to);
export const moveDuration = (from: Vec3, to: Vec3) => landingTime(from, to) + MOVE.landTime;

export interface MovePose {
  pos: Vec3;
  /** Skala pionowa (przysiad przy lądowaniu); poziomo 1/√squash — stała objętość. */
  squash: number;
  /** Pochylenie w kierunku lotu (rad). */
  lean: number;
  phase: 'lift' | 'flight' | 'land' | 'done';
}

export function movePose(from: Vec3, to: Vec3, t: number): MovePose {
  const lift = MOVE.liftTime;
  const flight = flightTime(from, to);
  if (t < lift) {
    const k = easeOutCubic(t / lift);
    return { pos: [from[0], from[1] + MOVE.liftHeight * k, from[2]], squash: 1, lean: 0, phase: 'lift' };
  }
  if (t < lift + flight) {
    const u = (t - lift) / flight;
    const start: Vec3 = [from[0], from[1] + MOVE.liftHeight, from[2]];
    return { pos: arcPoint(start, to, u), squash: 1, lean: Math.sin(Math.PI * easeInOutCubic(u)) * 0.2, phase: 'flight' };
  }
  const s = (t - lift - flight) / MOVE.landTime;
  if (s < 1) {
    if (s < MOVE.squashShare) {
      const k = Math.sin((Math.PI * s) / MOVE.squashShare);
      return { pos: [...to], squash: 1 - (1 - MOVE.squash) * k, lean: 0, phase: 'land' };
    }
    const h = (s - MOVE.squashShare) / (1 - MOVE.squashShare);
    return { pos: [to[0], to[1] + MOVE.bounceHeight * Math.sin(Math.PI * h), to[2]], squash: 1, lean: 0, phase: 'land' };
  }
  return { pos: [...to], squash: 1, lean: 0, phase: 'done' };
}

// ---------- przywołanie ----------

export const SUMMON = {
  total: 1.6,
  /** Figurka wyrasta z piasku między tymi chwilami (s). */
  riseStart: 0.18,
  riseEnd: 1.05,
  /** Kolumna światła: rozbłysk, utrzymanie, wygaszanie do końca. */
  columnIn: 0.15,
  columnHold: 0.85,
  /** Start skali przy wyrastaniu. */
  startScale: 0.82,
} as const;

export interface SummonPose {
  /** Przesunięcie pionowe figurki (ujemne — pod powierzchnią pola). */
  y: number;
  scale: number;
  /** Jasność kolumny światła 0..1. */
  column: number;
  done: boolean;
}

/** `height` — wysokość figurki; na starcie cała jest schowana pod powierzchnią pola. */
export function summonPose(t: number, height: number): SummonPose {
  const hidden = -(height + 0.12);
  const rise = clamp01((t - SUMMON.riseStart) / (SUMMON.riseEnd - SUMMON.riseStart));
  const k = rise <= 0 ? 0 : easeOutSoftBack(rise);
  let column = 0;
  if (t < SUMMON.columnIn) column = clamp01(t / SUMMON.columnIn);
  else if (t < SUMMON.columnHold) column = 1;
  else column = 1 - easeOutCubic((t - SUMMON.columnHold) / (SUMMON.total - SUMMON.columnHold));
  const done = t >= SUMMON.total;
  return {
    y: done ? 0 : hidden * (1 - k),
    scale: done ? 1 : SUMMON.startScale + (1 - SUMMON.startScale) * clamp01(k),
    column: done ? 0 : Math.max(0, column),
    done,
  };
}

// ---------- kamera ----------

/** Delikatne „oddychanie” kamery (operator z ręki): przesunięcie ogniska, |x|,|y| ≤ amp. */
export function cameraSway(t: number, amp = 0.06): Vec3 {
  return [
    amp * (0.7 * Math.sin(t * 0.83) + 0.3 * Math.sin(t * 1.91 + 1.3)),
    amp * 0.6 * (0.6 * Math.sin(t * 0.61 + 0.4) + 0.4 * Math.sin(t * 1.37 + 2.1)),
    0,
  ];
}

/** Punkt, za którym podąża kamera: część drogi od ujęcia bazowego do figurki. */
export function followPoint(base: Vec3, figure: Vec3, weight = 0.55): Vec3 {
  return [base[0] + (figure[0] - base[0]) * weight, base[1] + (figure[1] - base[1]) * weight, base[2] + (figure[2] - base[2]) * weight];
}
