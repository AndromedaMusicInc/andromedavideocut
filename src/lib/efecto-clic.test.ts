import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { useEditor } from "@/lib/editor/store.ts";
import { playback } from "@/lib/editor/playback.ts";
import type { Clip } from "@/lib/editor/types.ts";

const video = { id: "v", type: "video", trackId: "v1", name: "Video", start: 2, duration: 5, inPoint: 0, speed: 1, filter: "none", effect: "none" } as unknown as Clip;

describe("clic en un efecto crea una barra fx encima del video", () => {
  beforeEach(() => {
    useEditor.setState({ clips: [video], selectedId: null, selectedIds: [], trackOrder: ["t1", "o1", "fx1", "v1", "a1"], past: [], future: [], tell: () => {} } as never);
    playback.time = 3;
  });
  it("crea una barra en la pista de efectos que cubre el clip bajo el cabezal", () => {
    useEditor.getState().setEffect("vis-glitch" as never);
    const fx = useEditor.getState().clips.filter((c) => c.type === "fx");
    assert.equal(fx.length, 1);
    assert.equal(fx[0].trackId, "fx1");
    assert.deepEqual([fx[0].start, fx[0].duration], [2, 5]);
    assert.equal(useEditor.getState().selectedId, fx[0].id);
    assert.equal(useEditor.getState().clips.find((c) => c.id === "v")?.effect, "none");
  });
  it("usa la pista de efectos que exista aunque no se llame fx1", () => {
    useEditor.setState({ trackOrder: ["t1", "fx2", "v1", "a1"] });
    useEditor.getState().setEffect("vis-glitch" as never);
    assert.equal(useEditor.getState().clips.find((c) => c.type === "fx")?.trackId, "fx2");
  });
});
