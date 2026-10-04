import { useEffect, useRef } from "react";

import type { Rgb } from "./palette";
import type { GraphRenderer } from "./types";

// Personalidad de la constelación (pedido del humano de Saus, Ola 3): sobre el cielo oscuro, algunas
// estrellas REALES titilan y unas pocas brillan con destello en cruz, como en una placa del cielo.
// Es una capa Canvas encima del renderer que sigue a la cámara con renderer.toScreen; no añade
// puntos que no existan ni capta eventos. Con una poda activa baja a un susurro para que las dos
// candidatas manden. Con reduced motion no se dibuja.

const TWINKLERS = 110;
const FLARES = 14;

type Props = {
  renderer: GraphRenderer | null;
  count: number;
  colors: Rgb[];
  quiet: boolean;
};

export function Twinkle({ renderer, count, colors, quiet }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const quietRef = useRef(quiet);
  useEffect(() => {
    quietRef.current = quiet;
  }, [quiet]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!renderer || !canvas || !ctx || count === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Elegidas una vez con semilla fija: siempre las mismas estrellas, sin parpadeo entre montajes.
    let seed = 11;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const stars = Array.from({ length: Math.min(TWINKLERS, count) }, (_, k) => ({
      index: Math.floor(random() * count),
      phase: random() * Math.PI * 2,
      speed: 0.5 + random() * 1.3,
      flare: k < FLARES,
    }));

    let frame = 0;
    let level = quietRef.current ? 0.2 : 1;
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      if (document.hidden) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      // El volumen sigue a la poda con suavidad (sin saltos al llegar el ranking).
      level += ((quietRef.current ? 0.2 : 1) - level) * 0.06;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      for (const star of stars) {
        const point = renderer.toScreen(star.index);
        if (!point || point[0] < -20 || point[1] < -20 || point[0] > width + 20 || point[1] > height + 20) continue;
        const [x, y] = point;
        const glow = (0.5 + 0.5 * Math.sin((time / 1000) * star.speed + star.phase)) * level;
        const [r, g, b] = colors[star.index].map((c) => Math.round(c * 255));
        const radius = star.flare ? 9 + glow * 7 : 4 + glow * 4;
        const halo = ctx.createRadialGradient(x, y, 0, x, y, radius);
        halo.addColorStop(0, `rgb(255 255 255 / ${0.85 * glow})`);
        halo.addColorStop(0.25, `rgb(${r} ${g} ${b} / ${0.45 * glow})`);
        halo.addColorStop(1, `rgb(${r} ${g} ${b} / 0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        if (star.flare) {
          const len = radius * 1.6;
          ctx.strokeStyle = `rgb(238 244 249 / ${0.55 * glow})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(x - len, y);
          ctx.lineTo(x + len, y);
          ctx.moveTo(x, y - len);
          ctx.lineTo(x, y + len);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = "source-over";
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [renderer, count, colors]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />;
}
