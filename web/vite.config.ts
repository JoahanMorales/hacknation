import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// /api va a FastAPI en dev; en la demo FastAPI sirve web/dist (un solo proceso).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // cosmos (@cosmos.gl/graph y @cosmograph/cosmos) importa el default de gl-bench; su campo `browser`
  // apunta a un IIFE sin export, así que se fuerza el build ES module.
  resolve: { alias: { "gl-bench": "gl-bench/dist/gl-bench.module.js" } },
  // API_PORT por si 8000 está ocupado en la máquina: API_PORT=8001 npm --prefix web run dev
  server: { proxy: { "/api": `http://127.0.0.1:${process.env.API_PORT ?? 8000}` } },
});
