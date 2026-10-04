import type { Frame, GraphRenderer, RendererEvents } from "./types";

// Renderer Canvas 2D: provisional mientras llega @cosmograph/cosmos y plan B si WebGL falla en el
// proyector. Misma interfaz que el renderer de cosmos.gl: el resto de la feature no sabe cuál usa.

const HIT_RADIUS_PX = 10;
const CELL = 24; // celda del índice espacial, en unidades del layout

export function createCanvasRenderer(container: HTMLElement, events: RendererEvents): GraphRenderer {
  const canvas = document.createElement("canvas");
  canvas.className = "block h-full w-full";
  container.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;

  let positions: Float32Array = new Float32Array(0);
  let frame: Frame | null = null;
  let grid = new Map<string, number[]>();
  let width = 0;
  let height = 0;
  let dpr = 1;
  // Vista: centro en coordenadas del layout y escala px/unidad. El eje y del layout apunta arriba.
  const view = { cx: 0, cy: 0, scale: 1 };
  let viewAnim: { from: typeof view; to: typeof view; start: number; ms: number } | null = null;
  let fitted = false;
  let scheduled = 0;
  let hovered: number | null = null;
  let link: [number, number] | null = null;

  const toScreenRaw = (x: number, y: number): [number, number] => [
    (x - view.cx) * view.scale + width / 2,
    -(y - view.cy) * view.scale + height / 2,
  ];
  const toWorld = (sx: number, sy: number): [number, number] => [
    (sx - width / 2) / view.scale + view.cx,
    -(sy - height / 2) / view.scale + view.cy,
  ];

  function schedule() {
    if (!scheduled) scheduled = requestAnimationFrame(render);
  }

  function render(now: number) {
    scheduled = 0;
    if (viewAnim) {
      const t = Math.min(1, (now - viewAnim.start) / viewAnim.ms);
      const e = 1 - (1 - t) ** 3;
      view.cx = viewAnim.from.cx + (viewAnim.to.cx - viewAnim.from.cx) * e;
      view.cy = viewAnim.from.cy + (viewAnim.to.cy - viewAnim.from.cy) * e;
      view.scale = viewAnim.from.scale * (viewAnim.to.scale / viewAnim.from.scale) ** e;
      if (t < 1) schedule();
      else viewAnim = null;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (!frame) return;
    const { colors, sizes } = frame;
    const n = positions.length / 2;
    const zoom = Math.min(2.2, Math.max(0.8, Math.sqrt(view.scale / baseScale())));
    const halos: number[] = [];
    for (let i = 0; i < n; i++) {
      const alpha = colors[i * 4 + 3];
      if (alpha < 0.01) continue;
      const [sx, sy] = toScreenRaw(positions[i * 2], positions[i * 2 + 1]);
      if (sx < -20 || sy < -20 || sx > width + 20 || sy > height + 20) continue;
      const r = sizes[i] * zoom;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = rgb(colors, i);
      if (r < 1.4) {
        ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (sizes[i] > 3.5 || i === hovered) halos.push(i);
    }
    // Arista resaltada desde el inspector: curva fina en el acento.
    if (link) {
      const [ax, ay] = toScreenRaw(positions[link[0] * 2], positions[link[0] * 2 + 1]);
      const [bx, by] = toScreenRaw(positions[link[1] * 2], positions[link[1] * 2 + 1]);
      const mx = (ax + bx) / 2 - (by - ay) * 0.15;
      const my = (ay + by) / 2 + (bx - ax) * 0.15;
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = "rgb(30 111 217)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(mx, my, bx, by);
      ctx.stroke();
      halos.push(link[0], link[1]);
    }
    // Brillo aditivo sólo para candidatas, la arista resaltada y la estrella bajo el cursor.
    // Sobre fondo claro el brillo es un halo translúcido (lighter lo volvería blanco).
    for (const i of halos) {
      const [sx, sy] = toScreenRaw(positions[i * 2], positions[i * 2 + 1]);
      const r = Math.max(10, sizes[i] * zoom * 4);
      const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      gradient.addColorStop(0, rgba(colors, i, 0.55 * colors[i * 4 + 3]));
      gradient.addColorStop(1, rgba(colors, i, 0));
      ctx.globalAlpha = 1;
      ctx.fillStyle = gradient;
      ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }

  function bounds(indices: number[] | null) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const list = indices ?? Array.from({ length: positions.length / 2 }, (_, i) => i);
    for (const i of list) {
      minX = Math.min(minX, positions[i * 2]);
      maxX = Math.max(maxX, positions[i * 2]);
      minY = Math.min(minY, positions[i * 2 + 1]);
      maxY = Math.max(maxY, positions[i * 2 + 1]);
    }
    return { minX, minY, maxX, maxY };
  }

  function baseScale() {
    const b = bounds(null);
    return Math.min(width / (b.maxX - b.minX || 1), height / (b.maxY - b.minY || 1)) * 0.86;
  }

  function nearest(sx: number, sy: number): number | null {
    const [wx, wy] = toWorld(sx, sy);
    const reach = HIT_RADIUS_PX / view.scale;
    let best: number | null = null;
    let bestDist = reach;
    for (let gx = Math.floor((wx - reach) / CELL); gx <= Math.floor((wx + reach) / CELL); gx++) {
      for (let gy = Math.floor((wy - reach) / CELL); gy <= Math.floor((wy + reach) / CELL); gy++) {
        for (const i of grid.get(`${gx},${gy}`) ?? []) {
          // Las estrellas apagadas no se pueden elegir: sólo cuenta lo que se ve.
          if (frame && frame.colors[i * 4 + 3] < 0.3) continue;
          const d = Math.hypot(positions[i * 2] - wx, positions[i * 2 + 1] - wy);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        }
      }
    }
    return best;
  }

  function resize() {
    const rect = container.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (!fitted && positions.length) {
      fitted = true;
      const b = bounds(null);
      Object.assign(view, { cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2, scale: baseScale() });
    }
    schedule();
  }

  // Interacción: arrastrar para mover, rueda para acercar hacia el cursor, clic para elegir.
  let drag: { x: number; y: number; moved: boolean } | null = null;
  const local = (e: MouseEvent): [number, number] => {
    const rect = canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };
  const onDown = (e: PointerEvent) => {
    drag = { x: e.clientX, y: e.clientY, moved: false };
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (drag) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (drag.moved || Math.hypot(dx, dy) > 4) {
        drag.moved = true;
        viewAnim = null;
        view.cx -= dx / view.scale;
        view.cy += dy / view.scale;
        drag.x = e.clientX;
        drag.y = e.clientY;
        schedule();
        return;
      }
    }
    const index = nearest(...local(e));
    if (index !== hovered) {
      hovered = index;
      canvas.style.cursor = index === null ? "default" : "pointer";
      events.onHover(index);
      schedule();
    }
  };
  const onUp = (e: PointerEvent) => {
    if (drag && !drag.moved) events.onClick(nearest(...local(e)));
    drag = null;
  };
  const onLeave = () => {
    if (hovered !== null) {
      hovered = null;
      events.onHover(null);
      schedule();
    }
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    viewAnim = null;
    const [sx, sy] = local(e);
    const [wx, wy] = toWorld(sx, sy);
    const base = baseScale();
    view.scale = Math.min(base * 40, Math.max(base * 0.6, view.scale * Math.exp(-e.deltaY * 0.0015)));
    // Mantiene fijo el punto bajo el cursor.
    view.cx = wx - (sx - width / 2) / view.scale;
    view.cy = wy + (sy - height / 2) / view.scale;
    schedule();
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  return {
    setPositions(next) {
      positions = next;
      grid = new Map();
      for (let i = 0; i < next.length / 2; i++) {
        const key = `${Math.floor(next[i * 2] / CELL)},${Math.floor(next[i * 2 + 1] / CELL)}`;
        const cell = grid.get(key);
        if (cell) cell.push(i);
        else grid.set(key, [i]);
      }
      fitted = false;
      resize();
    },
    draw(next) {
      frame = next;
      schedule();
    },
    fitTo(indices, durationMs) {
      if (!positions.length || !width) return;
      const b = bounds(indices && indices.length ? indices : null);
      const spanX = Math.max(b.maxX - b.minX, 60);
      const spanY = Math.max(b.maxY - b.minY, 60);
      // Deja aire para los paneles laterales e inferior del layout de App.tsx.
      const scale = indices?.length ? Math.min((width * 0.4) / spanX, (height * 0.4) / spanY) : baseScale();
      const to = { cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2, scale };
      if (durationMs <= 0) {
        Object.assign(view, to);
        viewAnim = null;
      } else {
        viewAnim = { from: { ...view }, to, start: performance.now(), ms: durationMs };
      }
      schedule();
    },
    setLink(pair) {
      link = pair;
      schedule();
    },
    toScreen(index) {
      if (index < 0 || index >= positions.length / 2) return null;
      return toScreenRaw(positions[index * 2], positions[index * 2 + 1]);
    },
    destroy() {
      cancelAnimationFrame(scheduled);
      observer.disconnect();
      canvas.remove();
    },
  };
}

function rgb(colors: Float32Array, i: number): string {
  const o = i * 4;
  return `rgb(${(colors[o] * 255) | 0},${(colors[o + 1] * 255) | 0},${(colors[o + 2] * 255) | 0})`;
}

function rgba(colors: Float32Array, i: number, alpha: number): string {
  const o = i * 4;
  return `rgba(${(colors[o] * 255) | 0},${(colors[o + 1] * 255) | 0},${(colors[o + 2] * 255) | 0},${alpha})`;
}
