import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LANE_INSERT_EDGE, laneIntentFromBands } from "./editor/tracks.ts";

const bands = [{ id: "v1", top: 0, bottom: 40 }, { id: "a1", top: 40, bottom: 80 }];
const at = (y: number) => laneIntentFromBands(bands, y, null, LANE_INSERT_EDGE);
describe("mismo canal al soltar", () => {
  it("casi todo el canal es 'en este canal' (antes solo los 12 px del centro)", () => {
    for (const y of [8, 20, 32, 48, 60, 72]) assert.equal(at(y).mode, "on", `y=${y}`);
    assert.equal(at(56).trackId, "a1");
  });
  it("solo junto a la raya se inserta canal nuevo", () => {
    assert.deepEqual(at(37), { mode: "after", trackId: "v1" });
    assert.deepEqual(at(42), { mode: "before", trackId: "a1" });
    assert.deepEqual(at(77), { mode: "after", trackId: "a1" });
  });
});
