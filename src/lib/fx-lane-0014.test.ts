import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dropSpan, lookSpan } from "./editor/look-span.ts";
import { fxLaneFor, isVisualLane } from "./editor/tracks.ts";
import type { Clip } from "./editor/types.ts";

const clip = (p: Partial<Clip>) => ({ id: "c", type: "generator", trackId: "lane1", start: 0, duration: 5, ...p }) as Clip;

// Layout real de Wilhelm (0.0.13, proyecto nuevo 9:16): Texto, Overlay, Efectos, Canal (lane1 con "Ciudad neón"), Base, Audio.
const order = ["t1", "o1", "fx1", "lane1", "v1", "a1"];
const gens = [clip({ id: "n1", start: 0, duration: 4.9 }), clip({ id: "n2", start: 4.9, duration: 5 })];

describe("0.0.14: fx en la pista Efectos con el layout de proyecto nuevo", () => {
  it("un Canal con generadores es visual y nunca recibe la barra", () => {
    assert.equal(isVisualLane("lane1", gens), true);
    assert.equal(isVisualLane("fx1", gens), false);
    assert.equal(fxLaneFor(order, gens, 0, 4.9, "lane1").trackId, "fx1");
  });
  it("clic: Efectos libre, mismo tramo del clip bajo el cabezal", () => {
    const span = lookSpan(gens, 5.5);
    assert.deepEqual([span.start, span.duration], [4.9, 5]);
    assert.equal(fxLaneFor(order, gens, span.start, span.duration).trackId, "fx1");
  });
  it("Efectos ocupada: pista fx nueva arriba, sin correr el tiempo", () => {
    const busy = [...gens, clip({ id: "g", type: "fx", trackId: "fx1", start: 0, duration: 4.9 })];
    const lane = fxLaneFor(order, busy, 0, 4.9);
    assert.equal(lane.created, true);
    assert.ok(lane.order.indexOf(lane.trackId) < lane.order.indexOf("fx1"));
  });
  it("cabezal fuera de los clips: usa el clip seleccionado", () => {
    assert.deepEqual([lookSpan(gens, 20, "n2").start, lookSpan(gens, 20, "n2").duration], [4.9, 5]);
  });
  it("barra fx seleccionada o cabezal en un hueco: se alinea, no queda en el cabezal", () => {
    const sel = clip({ id: "f", type: "fx", trackId: "fx1", start: 4.9, duration: 5 });
    assert.equal(lookSpan([...gens, sel], 0.0 + 30, "f").start, 4.9);
    assert.equal(lookSpan([clip({ id: "x", start: 6, duration: 4 })], 1).start, 6);
  });
  it("arrastre: tramo del clip bajo el punto de soltar, en cualquier canal visual", () => {
    assert.deepEqual([dropSpan(gens, "fx1", 6).start, dropSpan(gens, "fx1", 6).duration], [4.9, 5]);
    assert.deepEqual(dropSpan(gens, "fx1", 30, 3), { start: 30, duration: 3, target: null });
  });
});
