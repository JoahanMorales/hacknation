import { useEffect, useRef } from "react";

// Onda de audio de la barra de dictado. Con micrófono lee el nivel real (AnalyserNode); en el caso de
// ejemplo dibuja una onda suave sintética. Sólo se anima mientras `active`; quieta, es una línea.
const BARS = 28;

export function Waveform({ stream, active }: { stream: MediaStream | null; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let audio: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let samples: Uint8Array<ArrayBuffer> | null = null;
    if (stream && active) {
      audio = new AudioContext();
      analyser = audio.createAnalyser();
      analyser.fftSize = 256;
      audio.createMediaStreamSource(stream).connect(analyser);
      samples = new Uint8Array(analyser.frequencyBinCount);
    }

    let frame = 0;
    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      if (analyser && samples) analyser.getByteFrequencyData(samples);
      const gap = 3;
      const barWidth = (width - gap * (BARS - 1)) / BARS;
      for (let i = 0; i < BARS; i++) {
        let level = 0.06;
        if (active && samples) level = Math.max(0.06, samples[Math.floor((i / BARS) * samples.length * 0.7)] / 255);
        else if (active && !reduced) level = 0.18 + 0.32 * Math.abs(Math.sin(now / 260 + i * 0.55) * Math.sin(now / 610 + i * 0.21));
        else if (active) level = 0.3;
        const barHeight = Math.max(2, level * height);
        ctx.fillStyle = active ? "rgb(237 201 148 / 0.85)" : "rgb(165 179 199 / 0.35)";
        ctx.beginPath();
        ctx.roundRect(i * (barWidth + gap), (height - barHeight) / 2, barWidth, barHeight, 1.5);
        ctx.fill();
      }
      if (active && !reduced) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      void audio?.close();
    };
  }, [stream, active]);

  return <canvas ref={canvasRef} aria-hidden className="h-8 w-full" />;
}
