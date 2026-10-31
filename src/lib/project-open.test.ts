import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeProject } from "./editor/project-normalize.ts";

describe("0.0.15: proyectos que no abren", () => {
  it("sin assets (antes: TypeError en saved.assets.length y el editor no cargaba los medios)", () => {
    const p = normalizeProject({ v: 1, name: "x", clips: [] })!;
    assert.deepEqual(p.assets, []);
  });
  it("sin clips: abre (antes se descartaba y abría vacío)", () => {
    assert.deepEqual(normalizeProject({ v: 1, name: "x", assets: [] })!.clips, []);
  });
  it("clip sin pista, con números como texto o basura: se repara", () => {
    const p = normalizeProject({ clips: [{ id: "a", type: "video", start: "4.9", duration: null }, { id: "t", type: "text" }, null, { type: "rara" }, { id: "a", type: "audio" }] })!;
    assert.deepEqual(p.clips.map((c) => [c.id, c.trackId, c.start, c.duration]), [["a", "v1", 4.9, 1], ["t", "t1", 0, 1], ["a-r", "a1", 0, 1]]);
  });
  it("aspect/muted/trackOrder inválidos no rompen", () => {
    const p = normalizeProject({ clips: [], aspect: "3:2", muted: [1], trackOrder: "v1", layers: "x" })!;
    assert.equal(p.aspect, "9:16"); assert.deepEqual(p.muted, {}); assert.equal(p.trackOrder, undefined); assert.equal(p.layers, 1);
  });
  it("texto con BOM y JSON roto", () => {
    assert.ok(normalizeProject("\uFEFF" + JSON.stringify({ v: 1, clips: [] })));
    assert.equal(normalizeProject('{"v":1,"clips":['), null);
    assert.equal(normalizeProject(null), null);
    assert.equal(normalizeProject([1, 2]), null);
  });
});
