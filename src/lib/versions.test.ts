import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dueCheckpoint, pruneVersions, type VersionMeta } from "./editor/versions.ts";

const v = (ts: number, reason: VersionMeta["reason"] = "auto"): VersionMeta => ({ ts, reason, bytes: 1, clips: 1 });
describe("puntos de control", () => {
  it("cada 2 minutos", () => {
    assert.equal(dueCheckpoint(0, 119_999), false);
    assert.equal(dueCheckpoint(0, 120_000), true);
  });
  it("se quedan las N más nuevas", () => {
    assert.deepEqual(pruneVersions([v(1), v(2), v(3), v(4)], 2).sort(), [1, 2]);
  });
  it("nunca se borra el último guardado manual", () => {
    assert.deepEqual(pruneVersions([v(1, "manual"), v(2), v(3), v(4)], 2), [2]);
  });
  it("si hay pocas no se borra nada", () => {
    assert.deepEqual(pruneVersions([v(1), v(2)], 30), []);
  });
});
