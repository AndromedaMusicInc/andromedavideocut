import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

// Versión única: la de desktop/package.json (las 0.0.x son betas; la 1.0.0 será el lanzamiento oficial).
const VERSION = JSON.parse(readFileSync(new URL("./desktop/package.json", import.meta.url), "utf8")).version as string;

// Build estático solo-frontend. base "./" = rutas relativas: sirve en GitHub Pages
// (subcarpeta) y dentro de un iframe de Google Sites. El backend original
// (server/, src/routes/api, auth, db) no entra en este build.
export default defineConfig({
  base: "./",
  define: { __APP_VERSION__: JSON.stringify(VERSION) },
  plugins: [tailwindcss(), react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: { outDir: "preview", emptyOutDir: true, chunkSizeWarningLimit: 1500 },
});
