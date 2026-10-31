import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { useEditor } from "@/lib/editor/store.ts";
import { playback } from "@/lib/editor/playback.ts";
import type { Clip } from "@/lib/editor/types.ts";

const video = { id: "v", type: "video", trackId: "v1", name: "Video", start: 2, duration: 5, inPoint: 0, speed: 1, filter: "none", effect: "none" } as unknown as Clip;
const fxBars = () => useEditor.getState().clips.filter((c) => c.type === "fx");
const order = () => useEditor.getState().trackOrder;

describe("0.0.13: la barra fx queda encima del video, no al lado", () => {
  beforeEach(() => {
    useEditor.setState({ clips: [video], selectedId: null, selectedIds: [], trackOrder: ["t1", "o1", "fx1", "v1", "a1"], past: [], future: [], tell: () => {} } as never);
    playback.time = 3;
  });
  it("dos efectos seguidos en el mismo tramo: el segundo va en un canal nuevo arriba, mismo tiempo", () => {
    useEditor.getState().setEffect("vis-glitch" as never);
    useEditor.getState().setEffect("vis-glitch" as never);
    const [a, b] = fxBars();
    assert.deepEqual([a.start, b.start], [2, 2]);
    assert.notEqual(a.trackId, b.trackId);
    const o = order();
    assert.ok(o.indexOf(b.trackId) < o.indexOf("v1") && o.indexOf(a.trackId) < o.indexOf("v1"));
  });
  it("efecto soltado sobre el clip de video: barra encima alineada con el clip", () => {
    useEditor.getState().placeItem({ kind: "effect", id: "vis-glitch", name: "Glitch" } as never, "v1", 4);
    const [fx] = fxBars();
    assert.notEqual(fx.trackId, "v1");
    assert.equal(fx.start, 2);
    assert.ok(order().indexOf(fx.trackId) < order().indexOf("v1"));
  });
  it("filtro con clic dos veces: no se corre a la derecha", () => {
    useEditor.getState().placeAdjust("filter", "bw" as never, "BN", 3, false, true);
    useEditor.getState().placeAdjust("filter", "bw" as never, "BN", 3, false, true);
    assert.deepEqual(fxBars().map((c) => c.start), [2, 2]);
  });
});
