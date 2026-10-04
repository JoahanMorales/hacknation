import { useEffect, useRef } from "react";

import type { HandPoint } from "./recognizer";

// HUD del brief: silueta de mano de líneas finas que refleja lo que ve la cámara, con un anillo que
// se completa durante el debounce (600 ms) antes de ejecutar el gesto.
const SIZE = 88;
const BONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

export function HandHud({ hand, progress, active }: { hand: HandPoint[] | null; progress: number; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);

    const center = SIZE / 2;
    const radius = SIZE / 2 - 3;
    // Anillo base y progreso del debounce.
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgb(16 48 42 / 0.15)";
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.stroke();
    if (progress > 0) {
      ctx.strokeStyle = "rgb(13 122 84)";
      ctx.beginPath();
      ctx.arc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();
    }

    if (!hand) return;
    // Encaja la mano en el círculo y la refleja en espejo (como se ve la propia mano).
    const xs = hand.map((point) => point.x);
    const ys = hand.map((point) => point.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) || 1;
    const scale = (SIZE * 0.56) / span;
    const offsetX = center - ((Math.max(...xs) - minX) * scale) / 2;
    const offsetY = center - ((Math.max(...ys) - minY) * scale) / 2;
    const at = (point: HandPoint): [number, number] => [
      SIZE - (offsetX + (point.x - minX) * scale),
      offsetY + (point.y - minY) * scale,
    ];
    ctx.strokeStyle = active ? "rgb(16 48 42 / 0.85)" : "rgb(75 102 96 / 0.55)";
    ctx.lineWidth = 1.25;
    ctx.lineCap = "round";
    for (const [a, b] of BONES) {
      const [ax, ay] = at(hand[a]);
      const [bx, by] = at(hand[b]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
  }, [hand, progress, active]);

  return <canvas ref={canvasRef} aria-hidden style={{ width: SIZE, height: SIZE }} />;
}
