import { ACCENT, type Rgb } from "./palette";
import type { Frame } from "./types";

// Coreografía de docs/FRONTEND-BRIEF.md, independiente del renderer:
//   intro   · las estrellas aparecen por galaxias de dentro hacia fuera en 1.2 s, una vez.
//   poda    · 0-150 ms pulso; 150-600 ms ola que atenúa lo que no coincide (alfa y tamaño);
//             600-900 ms las candidatas ganan brillo y tamaño. Total ≤ 900 ms.
// Cada punto interpola desde su valor actual: un ranking nuevo a mitad de animación no salta.

const BASE_SIZE = 1.05; // estrellas finas: la galaxia se lee como constelación, no como disco
const BASE_ALPHA = 0.85;
const DIM_ALPHA = 0.16;
const DIM_SIZE = 0.8;
const RANKED_SIZE = 2.2;
const CANDIDATE_SIZE = 8;

const INTRO_MS = 1200;
const WAVE_START = 150;
const WAVE_SPREAD = 300; // la ola tarda 300 ms en llegar al punto más lejano
const POINT_MS = 150; // cada punto termina su transición 150 ms después de que lo alcanza la ola
const CANDIDATE_START = 600;
const CANDIDATE_MS = 300;

type Target = { rgb: Rgb; alpha: number; size: number; delay: number; duration: number };

export class Choreography {
  readonly count: number;
  private readonly positions: Float32Array;
  private readonly base: Rgb[];
  private readonly from = { colors: new Float32Array(0), sizes: new Float32Array(0) };
  private targets: Target[] = [];
  private startedAt = 0;
  private totalMs = 0;
  readonly frame: Frame;

  constructor(positions: Float32Array, base: Rgb[]) {
    this.count = base.length;
    this.positions = positions;
    this.base = base;
    this.frame = { colors: new Float32Array(this.count * 4), sizes: new Float32Array(this.count) };
    // Arranca invisible: la intro las enciende.
    for (let i = 0; i < this.count; i++) {
      this.frame.colors.set([...base[i], 0], i * 4);
      this.frame.sizes[i] = BASE_SIZE;
    }
  }

  /** Intro de apertura: retraso proporcional a la distancia al centro del layout. */
  intro(now: number, reducedMotion: boolean): void {
    const maxDist = this.maxDistanceFrom(0, 0);
    this.retarget(now, (i, dist) => ({
      rgb: this.base[i],
      alpha: BASE_ALPHA,
      size: BASE_SIZE,
      delay: reducedMotion ? 0 : (dist(0, 0) / maxDist) * (INTRO_MS - 400),
      duration: reducedMotion ? 0 : 400,
    }));
  }

  /**
   * Poda según el ranking: `candidates` (top 2) en acento, `ranked` (resto del top) visibles,
   * todo lo demás atenuado. `origin` es de dónde sale el pulso (índice de punto) o null = centro.
   * Sin ranking, vuelve al estado base.
   */
  prune(now: number, candidates: number[], ranked: number[], origin: number | null, reducedMotion: boolean): void {
    const isCandidate = new Set(candidates);
    const isRanked = new Set(ranked);
    const empty = candidates.length === 0 && ranked.length === 0;
    const [ox, oy] = origin === null ? [0, 0] : this.position(origin);
    const maxDist = this.maxDistanceFrom(ox, oy);
    const pointMs = reducedMotion ? 0 : POINT_MS;

    this.retarget(now, (i, dist) => {
      const waveDelay = reducedMotion ? 0 : WAVE_START + (dist(ox, oy) / maxDist) * WAVE_SPREAD;
      if (empty) return { rgb: this.base[i], alpha: BASE_ALPHA, size: BASE_SIZE, delay: waveDelay, duration: pointMs };
      if (isCandidate.has(i)) {
        return {
          rgb: ACCENT,
          alpha: 1,
          size: CANDIDATE_SIZE,
          delay: reducedMotion ? 0 : CANDIDATE_START,
          duration: reducedMotion ? 0 : CANDIDATE_MS,
        };
      }
      if (isRanked.has(i)) {
        return { rgb: this.base[i], alpha: 0.95, size: RANKED_SIZE, delay: waveDelay, duration: pointMs };
      }
      return { rgb: this.base[i], alpha: DIM_ALPHA, size: DIM_SIZE, delay: waveDelay, duration: pointMs };
    });
  }

  /** Avanza la animación; devuelve true mientras quede algo por mover. */
  step(now: number): boolean {
    if (this.targets.length === 0) return false;
    const elapsed = now - this.startedAt;
    const { colors, sizes } = this.frame;
    for (let i = 0; i < this.count; i++) {
      const target = this.targets[i];
      const raw = target.duration === 0 ? (elapsed >= target.delay ? 1 : 0) : (elapsed - target.delay) / target.duration;
      const t = easeOutExpo(Math.min(1, Math.max(0, raw)));
      const o = i * 4;
      colors[o] = lerp(this.from.colors[o], target.rgb[0], t);
      colors[o + 1] = lerp(this.from.colors[o + 1], target.rgb[1], t);
      colors[o + 2] = lerp(this.from.colors[o + 2], target.rgb[2], t);
      colors[o + 3] = lerp(this.from.colors[o + 3], target.alpha, t);
      sizes[i] = lerp(this.from.sizes[i], target.size, t);
    }
    if (elapsed >= this.totalMs) {
      this.targets = [];
      return false;
    }
    return true;
  }

  private retarget(now: number, make: (i: number, dist: (x: number, y: number) => number) => Target): void {
    this.from.colors = this.frame.colors.slice();
    this.from.sizes = this.frame.sizes.slice();
    this.startedAt = now;
    this.totalMs = 0;
    const targets: Target[] = new Array(this.count);
    for (let i = 0; i < this.count; i++) {
      const [px, py] = this.position(i);
      const target = make(i, (x, y) => Math.hypot(px - x, py - y));
      targets[i] = target;
      this.totalMs = Math.max(this.totalMs, target.delay + target.duration);
    }
    this.targets = targets;
  }

  private position(i: number): [number, number] {
    return [this.positions[i * 2], this.positions[i * 2 + 1]];
  }

  private maxDistanceFrom(x: number, y: number): number {
    let max = 1;
    for (let i = 0; i < this.count; i++) {
      max = Math.max(max, Math.hypot(this.positions[i * 2] - x, this.positions[i * 2 + 1] - y));
    }
    return max;
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - 2 ** (-10 * t);
}
