const test = require("node:test"); const assert = require("node:assert");
const Module = require("module"); const fs = require("fs"); const os = require("os"); const path = require("path");
const orig = Module._load; Module._load = (r, ...a) => (r === "electron" ? { app: {}, ipcMain: {} } : orig(r, ...a));
const { readJson } = require("../projects.cjs");
const d = fs.mkdtempSync(path.join(os.tmpdir(), "avc-")); const f = path.join(d, "p.json");
test(".tmp huérfano más nuevo y válido se recupera", () => {
  fs.writeFileSync(f, JSON.stringify({ clips: [1] })); fs.utimesSync(f, 1000, 1000);
  fs.writeFileSync(`${f}.tmp`, JSON.stringify({ clips: [1, 2] }));
  assert.deepStrictEqual(readJson(f).clips, [1, 2]); assert.ok(!fs.existsSync(`${f}.tmp`));
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(f)).clips, [1, 2]);
});
test(".tmp a medias se descarta", () => {
  fs.writeFileSync(`${f}.tmp`, "{\"clips\":[1,");
  assert.deepStrictEqual(readJson(f).clips, [1, 2]); assert.ok(!fs.existsSync(`${f}.tmp`));
});
