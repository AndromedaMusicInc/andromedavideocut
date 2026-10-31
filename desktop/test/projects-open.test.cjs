// 0.0.15: proyectos que no abrían / desaparecían de Inicio.
const test = require("node:test"); const assert = require("node:assert");
const Module = require("module"); const fs = require("fs"); const os = require("os"); const path = require("path");
const orig = Module._load; Module._load = (r, ...a) => (r === "electron" ? { app: {}, ipcMain: {} } : orig(r, ...a));
const { readJson, readIndex } = require("../projects.cjs");
const d = fs.mkdtempSync(path.join(os.tmpdir(), "avc-open-"));
test("proyecto con BOM al inicio abre", () => {
  const f = path.join(d, "pbom.json"); fs.writeFileSync(f, "\uFEFF" + JSON.stringify({ v: 1, clips: [] }));
  assert.ok(readJson(f));
});
test("proyecto sin 'clips' (viejo o recortado) no se descarta", () => {
  const f = path.join(d, "pold.json"); fs.writeFileSync(f, JSON.stringify({ v: 1, name: "Viejo", assets: [] }));
  assert.equal(readJson(f).name, "Viejo");
});
test("principal truncado: se usa la copia .bak", () => {
  const f = path.join(d, "ptrunc.json"); fs.writeFileSync(f, '{"v":1,"clips":[{"id"'); fs.writeFileSync(`${f}.bak`, JSON.stringify({ v: 1, clips: [{ id: "a" }] }));
  assert.equal(readJson(f).clips[0].id, "a");
});
test("index.json dañado: se usa index.json.bak", () => {
  const b = fs.mkdtempSync(path.join(os.tmpdir(), "avc-idx-"));
  fs.writeFileSync(path.join(b, "index.json"), "{roto"); fs.writeFileSync(path.join(b, "index.json.bak"), JSON.stringify([{ id: "p1", name: "A" }]));
  assert.deepStrictEqual(readIndex(b).map((m) => m.id), ["p1"]);
});
test("index.json dañado y sin copia: se rearma con los proyectos del disco", () => {
  const b = fs.mkdtempSync(path.join(os.tmpdir(), "avc-idx-"));
  fs.writeFileSync(path.join(b, "index.json"), ""); fs.mkdirSync(path.join(b, "history"));
  fs.writeFileSync(path.join(b, "pa.json"), JSON.stringify({ v: 1, name: "Reel A", aspect: "16:9", clips: [] }));
  fs.writeFileSync(path.join(b, "pb.json"), "basura");
  const list = readIndex(b);
  assert.deepStrictEqual(list.map((m) => [m.id, m.name, m.aspect]), [["pa", "Reel A", "16:9"]]);
});
