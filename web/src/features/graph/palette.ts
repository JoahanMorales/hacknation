// Paleta PROVISIONAL de la constelación hasta que HACK-005 publique web/DESIGN.md; entonces se
// sustituye por sus tokens. Por qué: la pantalla tiene que verse bien ya, sin esperar al diseño.
// Regla del brief: color = significado. Cada galaxia (sistema del cuerpo) tiene un tono frío y
// desaturado; el ÚNICO acento cálido queda reservado para las candidatas.

export type Rgb = [number, number, number];

export const ACCENT: Rgb = hexToRgb("#f4b860");
export const BRIDGE: Rgb = hexToRgb("#e7ecf5");

function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)];
}

/**
 * Un color por galaxia, repartido en la rueda saltándose la franja cálida del acento (20°-70°).
 * Las galaxias grandes reciben los tonos más separados entre sí.
 */
export function galaxyColors(groupIds: string[]): Map<string, Rgb> {
  const start = 75;
  const span = 360 - 50; // 70° → 380° (= 20°), sin pasar por el acento
  const colors = new Map<string, Rgb>();
  groupIds.forEach((id, i) => {
    // Orden "golden" para que vecinos en la lista no tengan tonos parecidos.
    const t = (i * 0.618034) % 1;
    const hue = (start + t * span) % 360;
    const lightness = i % 2 === 0 ? 0.7 : 0.62;
    colors.set(id, hslToRgb(hue, 0.42, lightness));
  });
  return colors;
}
