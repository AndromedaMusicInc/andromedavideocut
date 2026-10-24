import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isTrackHidden, liveClips, setHiddenTracks } from "./editor/types.ts";
import { laneIntentFromBands } from "./editor/tracks.ts";

const c = (id: string, trackId: string, disabled?: boolean) => ({ id, trackId, disabled });

describe("ojito por pista", () => {
  it("una pista oculta sale de los clips vivos (visor y exportación)", () => {
    setHiddenTracks({ v2: true, a1: false });
    const out = liveClips([c("a", "v1"), c("b", "v2"), c("d", "a1")]);
    assert.deepEqual(out.map((x) => x.id), ["a", "d"]);
    assert.equal(isTrackHidden("v2"), true);
    assert.equal(isTrackHidden("a1"), false);
  });
  it("al mostrarla vuelve, y los desactivados siguen fuera", () => {
    setHiddenTracks({});
    const out = liveClips([c("a", "v1"), c("b", "v2"), c("x", "v1", true)]);
    assert.deepEqual(out.map((x) => x.id), ["a", "b"]);
  });
});

describe("línea de inserción entre canales", () => {
  const bands = [
    { id: "v1", top: 0, bottom: 40 },
    { id: "v2", top: 40, bottom: 80 },
  ];
  it("cerca del borde entre dos canales = insertar (línea)", () => {
    assert.deepEqual(laneIntentFromBands(bands, 41, null, 8), { mode: "before", trackId: "v2" });
  });
  it("en el centro de un canal = usar ese canal", () => {
    assert.deepEqual(laneIntentFromBands(bands, 60, null, 8), { mode: "on", trackId: "v2" });
  });
});
