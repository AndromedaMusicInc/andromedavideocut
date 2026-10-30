import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { lookSpan } from "./editor/look-span.ts";
import type { Clip } from "./editor/types.ts";

const clip = (p: Partial<Clip>) => ({ id: "c", type: "video", trackId: "v1", start: 0, duration: 5, ...p }) as Clip;

describe("filtro/look con clic va en barra sobre el video", () => {
  it("cubre el clip bajo el cabezal", () => {
    const clips = [clip({ id: "a", start: 0, duration: 4 }), clip({ id: "b", start: 4, duration: 6 })];
    const s = lookSpan(clips, 5);
    assert.equal(s.target?.id, "b");
    assert.deepEqual([s.start, s.duration], [4, 6]);
  });
  it("tope de 8 s y mínimo 1.2 s, como los efectos", () => {
    assert.equal(lookSpan([clip({ duration: 30 })], 2).duration, 8);
    assert.equal(lookSpan([clip({ duration: 0.5 })], 0.2).duration, 1.2);
  });
  it("sin video bajo el cabezal: 3 s desde el cabezal", () => {
    assert.deepEqual(lookSpan([clip({ start: 0, duration: 2 })], 7), { start: 7, duration: 3, target: null });
  });
  it("ignora audio y barras fx", () => {
    const clips = [clip({ id: "x", type: "audio", trackId: "a1" }), clip({ id: "f", type: "fx", trackId: "fx1" })];
    assert.equal(lookSpan(clips, 1).target, null);
  });
});
