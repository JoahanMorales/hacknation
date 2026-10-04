// Paleta de la constelación. Regla del brief y de web/DESIGN.md: color = significado.
// Tema azul clínico (Ola 3): cada galaxia (sistema del cuerpo) tiene un tono medio legible sobre blanco; los
// seis colores semánticos de DESIGN.md son de mecanismo y no se usan aquí. El ÚNICO acento azul es
// para las candidatas, así que las galaxias evitan la franja azul.

export type Rgb = [number, number, number];

export const ACCENT: Rgb = hexToRgb("#1e6fd9"); // accent de web/DESIGN.md

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
 * Un color por galaxia, repartido en la rueda saltándose la franja azul del acento (190°-240°).
 * Las galaxias grandes reciben los tonos más separados entre sí.
 */
export function galaxyColors(groupIds: string[]): Map<string, Rgb> {
  const start = 240;
  const span = 360 - 50; // 240° → 550° (= 190°), sin pasar por el acento
  const colors = new Map<string, Rgb>();
  groupIds.forEach((id, i) => {
    // Orden "golden" para que vecinos en la lista no tengan tonos parecidos.
    const t = (i * 0.618034) % 1;
    const hue = (start + t * span) % 360;
    const lightness = i % 2 === 0 ? 0.42 : 0.34;
    colors.set(id, hslToRgb(hue, 0.58, lightness));
  });
  return colors;
}
