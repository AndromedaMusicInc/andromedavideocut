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
const fx = () => useEditor.getState().clips.filter((c) => c.type === "fx");
const order = () => useEditor.getState().trackOrder;
const above = (c: Clip) => { const o = order(); return useEditor.getState().clips.filter((x) => x.type !== "fx" && x.type !== "audio" && x.type !== "text").every((x) => o.indexOf(c.trackId) < o.indexOf(x.trackId)); };

describe("QA 0.0.15 store", () => {
  it("soltar filtro a 6 s sobre la Base cubre 4.9-9.9, encima, y no toca barras existentes; undo/redo", () => {
    reset();
    setLaneIntent({ mode: "on", trackId: "v1" });
    useEditor.getState().placeAdjust("filter", "portra800", "Portra", 6);
    let f = fx();
    assert.equal(f.length, 1); assert.equal(f[0]!.start, 4.9); assert.equal(f[0]!.duration, 5); assert.ok(above(f[0]!));
    assert.equal(f[0]!.filter, "portra800");
    assert.ok(playback.time >= 4.9 && playback.time < 9.9, `cabezal ${playback.time}`);
    const first = { ...f[0]! };
    setLaneIntent({ mode: "on", trackId: "v1" });
    useEditor.getState().placeAdjust("effect", "velocity", "Velocity", 7);
    f = fx();
    assert.equal(f.length, 2);
    const kept = f.find((c) => c.id === first.id)!;
    assert.deepEqual([kept.start, kept.duration, kept.trackId], [first.start, first.duration, first.trackId]);
    assert.ok(f.every(above));
    useEditor.getState().undo(); assert.equal(fx().length, 1);
    useEditor.getState().redo(); assert.equal(fx().length, 2);
  });
  it("Canal nuevo crea pista", () => {
    reset();
    const n = order().length;
    setLaneIntent({ mode: "before", trackId: "v1" });
    useEditor.getState().placeAdjust("filter", "portra800", "Portra", 6);
    assert.equal(order().length, n + 1);
    assert.ok(above(fx()[0]!));
  });
  it("dos clics seguidos alineados", () => {
    reset();
    playback.time = 6;
    useEditor.getState().placeAdjust("filter", "portra800", "P", 6, false, true);
    useEditor.getState().placeAdjust("effect", "velocity", "V", playback.time, false, true);
    const f = fx();
    assert.equal(f.length, 2);
    assert.deepEqual([f[0]!.start, f[0]!.duration], [f[1]!.start, f[1]!.duration]);
    assert.equal(f[0]!.start, 4.9);
  });
  it("clip de 10 s: la barra usa el tope de diseño de 8 s", () => {
    useEditor.getState().loadSaved({ v: 1, name: "qa", aspect: "9:16", clips: [v("a", 0, 10)], muted: {}, assets: [] });
    setLaneIntent({ mode: "on", trackId: "v1" });
    useEditor.getState().placeAdjust("filter", "portra800", "P", 3);
    assert.equal(fx()[0]!.duration, 8);
  });
});
