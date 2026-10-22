// Copia el build estático (../preview) a ./app para empaquetarlo.
const fs = require("fs");
const path = require("path");
const src = path.join(__dirname, "..", "..", "preview");
const dst = path.join(__dirname, "..", "app");
if (!fs.existsSync(path.join(src, "index.html"))) {
  console.error("No hay build en ../preview. Corre primero `npm run build` en la raíz.");
  process.exit(1);
}
fs.rmSync(dst, { recursive: true, force: true });
fs.cpSync(src, dst, { recursive: true });
console.log("Build copiado a desktop/app");
