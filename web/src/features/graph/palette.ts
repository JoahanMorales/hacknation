// Paleta de la constelación. Regla del brief y de web/DESIGN.md: color = significado.
// Ola 3 (menos color): las galaxias van en una familia tonal casi monocroma sobre el fondo oscuro; los
// seis colores semánticos de DESIGN.md son de mecanismo y no se usan aquí. El ÚNICO acento azul es
// para las candidatas, así que las galaxias evitan la franja azul.

export type Rgb = [number, number, number];

export const ACCENT: Rgb = hexToRgb("#8ec5fc"); // accent de web/DESIGN.md

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
 * Un color por galaxia en una familia tonal casi monocroma (Ola 3, menos color): el mismo gris
 * azulado y sólo la luminosidad separa galaxias vecinas (orden "golden"). El sistema del cuerpo se
 * lee por nombre al pasar el ratón; el color queda para el acento de las candidatas.
 */
export function galaxyColors(groupIds: string[]): Map<string, Rgb> {
  const colors = new Map<string, Rgb>();
  groupIds.forEach((id, i) => {
    const t = (i * 0.618034) % 1;
    colors.set(id, hslToRgb(212, 0.16, 0.6 + t * 0.2));
  });
  return colors;
}
