import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

// Build estático solo-frontend. base "./" = rutas relativas: sirve en GitHub Pages
// (subcarpeta) y dentro de un iframe de Google Sites. El backend original
// (server/, src/routes/api, auth, db) no entra en este build.
export default defineConfig({
  base: "./",
  plugins: [tailwindcss(), react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: { outDir: "preview", emptyOutDir: true, chunkSizeWarningLimit: 1500 },
});
