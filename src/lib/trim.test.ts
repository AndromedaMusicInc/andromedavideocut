import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FRAME, nudgeEnd, trimAt, trimTarget } from "./editor/trim.ts";

const c = (id: string, trackId: string, start: number, duration: number, extra = {}) => ({ id, trackId, start, duration, inPoint: 0, speed: 1, type: "video", ...extra }) as never;
const get = (cl: unknown[] | null, id: string) => (cl as { id: string; start: number; duration: number; inPoint: number }[]).find((k) => k.id === id)!;
const base = () => [c("a", "v1", 0, 4), c("b", "v1", 4, 3), c("x", "v2", 5, 2)];
describe("atajos de recorte", () => {
  it("[ recorta el inicio al cabezal (deja hueco)", () => {
    const r = trimAt(base(), [], "a", "start", 1);
    assert.deepEqual([get(r, "a").start, get(r, "a").duration, get(r, "a").inPoint], [1, 3, 1]);
    assert.equal(get(r, "b").start, 4);
  });
  it("] recorta el final al cabezal", () => {
    const r = trimAt(base(), [], "a", "end", 2.5);
    assert.equal(get(r, "a").duration, 2.5);
    assert.equal(get(r, "b").start, 4);
  });
  it("Q recorta el inicio y cierra el hueco (lo siguiente de la pista se corre)", () => {
    const r = trimAt(base(), [], "a", "rippleStart", 1);
    assert.deepEqual([get(r, "a").start, get(r, "a").duration, get(r, "a").inPoint], [0, 3, 1]);
    assert.equal(get(r, "b").start, 3);
    assert.equal(get(r, "x").start, 5, "otras pistas no se tocan");
  });
  it("W recorta el final y cierra el hueco", () => {
    const r = trimAt(base(), [], "a", "rippleEnd", 3);
    assert.equal(get(r, "a").duration, 3);
    assert.equal(get(r, "b").start, 3);
  });
  it("cabezal fuera del clip = no hace nada", () => {
    assert.equal(trimAt(base(), [], "a", "end", 5), null);
  });
  it("recorte por cuadro (1/30 s), sin pasar del largo del medio", () => {
    const r = nudgeEnd(base(), [], "a", -1);
    assert.ok(Math.abs(get(r, "a").duration - (4 - FRAME)) < 1e-9);
    const assets = [{ id: "m", duration: 4 }] as never;
    assert.equal(nudgeEnd([c("a", "v1", 0, 4, { assetId: "m" })], assets, "a", +1), null);
  });
  it("objetivo: el seleccionado o el de más arriba bajo el cabezal", () => {
    assert.equal((trimTarget(base(), null, 5.5, ["v2", "v1"]) as { id: string }).id, "x");
    assert.equal((trimTarget(base(), "b", 5.5, ["v2", "v1"]) as { id: string }).id, "b");
  });
});
