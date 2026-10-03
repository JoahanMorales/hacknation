import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// /api va a FastAPI en dev; en la demo FastAPI sirve web/dist (un solo proceso).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // API_PORT por si 8000 está ocupado en la máquina: API_PORT=8001 npm --prefix web run dev
  server: { proxy: { "/api": `http://127.0.0.1:${process.env.API_PORT ?? 8000}` } },
});
