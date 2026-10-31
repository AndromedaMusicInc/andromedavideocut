const g = globalThis as unknown as Record<string, unknown>;
g.window ??= Object.assign(globalThis, { addEventListener() {}, removeEventListener() {}, setTimeout, clearTimeout });
g.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
g.requestAnimationFrame ??= () => 0; g.cancelAnimationFrame ??= () => {};
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeClip, type Clip } from "@/lib/editor/types";
import { playback } from "@/lib/editor/playback";
const { useEditor } = await import("@/lib/editor/store");
const { setLaneIntent } = await import("@/lib/editor/place");

const v = (id: string, start: number, duration: number, trackId = "v1") => makeClip({ id, type: "video", trackId, name: id, start, duration });
function reset() {
  useEditor.getState().loadSaved({ v: 1, name: "qa", aspect: "9:16", clips: [v("a", 0, 4.9), v("b", 4.9, 5)], muted: {}, assets: [] });
}
const bands = (id: string) => useEditor.getState().clips.find((c) => c.id === id)?.fx ?? [];
const fx = () => useEditor.getState().clips.filter((c) => c.type === "fx");
const order = () => useEditor.getState().trackOrder;
const above = (c: Clip) => { const o = order(); return useEditor.getState().clips.filter((x) => x.type !== "fx" && x.type !== "audio" && x.type !== "text").every((x) => o.indexOf(c.trackId) < o.indexOf(x.trackId)); };

describe("0.0.16 store: el filtro cae DENTRO del clip (antes 0.0.15: barra aparte)", () => {
  it("soltar filtro a 6 s sobre la Base lo mete en el clip b, sin crear barras; luego otro efecto se apila; undo/redo", () => {
    reset();
    setLaneIntent({ mode: "on", trackId: "v1" });
    useEditor.getState().placeAdjust("filter", "portra800", "Portra", 6);
    assert.equal(fx().length, 0);
    assert.deepEqual(bands("b").map((b) => [b.kind, b.ref, b.start, b.end]), [["filter", "portra800", 0, 5]]);
    assert.equal(bands("a").length, 0);
    assert.ok(playback.time >= 4.9 && playback.time < 9.9, `cabezal ${playback.time}`);
    assert.equal(useEditor.getState().selectedFx?.clipId, "b");
    setLaneIntent({ mode: "on", trackId: "v1" });
    useEditor.getState().placeAdjust("effect", "velocity", "Velocity", 7);
    assert.deepEqual(bands("b").map((b) => b.kind), ["filter", "effect"]);
    useEditor.getState().undo(); assert.equal(bands("b").length, 1);
    useEditor.getState().redo(); assert.equal(bands("b").length, 2);
  });
  it("Canal nuevo sigue creando una barra en pista aparte (opción secundaria)", () => {
    reset();
    const n = order().length;
    setLaneIntent({ mode: "before", trackId: "v1" });
    useEditor.getState().placeAdjust("filter", "portra800", "Portra", 6);
    assert.equal(order().length, n + 1);
    assert.ok(above(fx()[0]!));
  });
  it("dos clics seguidos: ambos dentro del mismo clip", () => {
    reset();
    playback.time = 6;
    useEditor.getState().placeAdjust("filter", "portra800", "P", 6, false, true);
    useEditor.getState().placeAdjust("effect", "velocity", "V", playback.time, false, true);
    assert.equal(bands("b").length, 2);
  });
  it("editar, achicar, borrar con Supr y dividir el clip", () => {
    reset();
    setLaneIntent({ mode: "on", trackId: "v1" });
    useEditor.getState().placeAdjust("filter", "portra800", "P", 6);
    const id = bands("b")[0]!.id;
    useEditor.getState().patchClipFx("b", id, { start: 1, end: 9, intensity: 0.5 });
    assert.deepEqual([bands("b")[0]!.start, bands("b")[0]!.end, bands("b")[0]!.intensity], [0, 5, 0.5]);
    useEditor.getState().patchClipFx("b", id, { start: 1, end: 4 });
    useEditor.getState().splitAt(7.4);
    const parts = useEditor.getState().clips.filter((c) => c.type === "video" && c.start >= 4.9).sort((x, y) => x.start - y.start);
    assert.deepEqual(parts.map((c) => (c.fx ?? []).map((b) => [b.start, +b.end.toFixed(2)])), [[[1, 2.5]], [[0, 1.5]]]);
    useEditor.getState().selectFx(parts[0]!.id, parts[0]!.fx![0]!.id);
    useEditor.getState().deleteSelected();
    assert.equal(useEditor.getState().clips.find((c) => c.id === parts[0]!.id)?.fx?.length, 0);
    assert.ok(useEditor.getState().clips.some((c) => c.id === parts[0]!.id), "Supr borra la capa, no el clip");
  });
  it("proyecto guardado conserva las capas y los proyectos viejos con barras siguen igual", () => {
    useEditor.getState().loadSaved({ v: 1, name: "qa", aspect: "9:16", muted: {}, assets: [], clips: [
      { ...v("a", 0, 4), fx: [{ id: "k", kind: "grade", ref: "gold200", name: "Gold 200", intensity: 1, start: 0, end: 4 }] },
      makeClip({ id: "old", type: "fx", trackId: "fx1", name: "BN", start: 0, duration: 2, filter: "bw" as Clip["filter"] }),
    ] } as never);
    assert.equal(bands("a")[0]!.ref, "gold200");
    assert.equal(fx()[0]!.id, "old");
  });
});
