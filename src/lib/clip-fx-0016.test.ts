import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { activeBands, clampBand, dragBand, fxTarget, normalizeBands, splitBands, trimBandsEnd, trimBandsStart } from "./editor/clip-fx.ts";
import type { Clip, ClipFx } from "./editor/types.ts";

const clip = (p: Partial<Clip>) => ({ id: "c", type: "video", trackId: "v1", start: 0, duration: 5, ...p }) as Clip;
const band = (p: Partial<ClipFx>): ClipFx => ({ id: "b", kind: "filter", ref: "warm", name: "Cálido", intensity: 1, start: 0, end: 5, ...p });

describe("0.0.16: filtros dentro del clip", () => {
  it("elige el clip bajo el punto de soltar en ese canal", () => {
    const a = clip({ id: "a", start: 0, duration: 4.9 });
    const b = clip({ id: "b", start: 4.9, duration: 5 });
    assert.equal(fxTarget([a, b], { trackId: "v1", time: 9.3 })?.id, "b");
  });
  it("clic: el clip seleccionado gana; si no, la capa visible más alta", () => {
    const base = clip({ id: "base" });
    const top = clip({ id: "top", trackId: "lane1", start: 1, duration: 3 });
    assert.equal(fxTarget([base, top], { time: 2, fromClick: true, order: ["lane1", "v1"] })?.id, "top");
    assert.equal(fxTarget([base, top], { time: 2, fromClick: true, selectedId: "base", order: ["lane1", "v1"] })?.id, "base");
    assert.equal(fxTarget([base], { time: 9, fromClick: true }), null);
  });
  it("mover y estirar quedan dentro del clip", () => {
    const b = band({ start: 1, end: 2 });
    assert.deepEqual([dragBand(b, "move", 10, 5).start, dragBand(b, "move", 10, 5).end], [4, 5]);
    assert.equal(dragBand(b, "start", -5, 5).start, 0);
    assert.equal(dragBand(b, "end", 10, 5).end, 5);
    assert.ok(dragBand(b, "end", -5, 5).end - b.start >= 0.199);
    assert.deepEqual([clampBand(band({ start: -1, end: 9 }), 5).start, clampBand(band({ start: -1, end: 9 }), 5).end], [0, 5]);
  });
  it("solo aplica dentro de su tramo", () => {
    const c = clip({ start: 10, fx: [band({ start: 1, end: 2 })] });
    assert.equal(activeBands(c, 10.5).length, 0);
    assert.equal(activeBands(c, 11.5).length, 1);
    assert.equal(activeBands(c, 12).length, 0);
  });
  it("dividir reparte las capas", () => {
    let n = 0;
    const [l, r] = splitBands([band({ start: 1, end: 4 }), band({ id: "x", start: 0, end: 1 })], 2, 5, () => `n${++n}`);
    assert.deepEqual(l!.map((b) => [b.start, b.end]), [[1, 2], [0, 1]]);
    assert.deepEqual(r!.map((b) => [b.start, b.end]), [[0, 2]]);
  });
  it("recortar el clip mantiene la capa sobre el mismo contenido", () => {
    assert.deepEqual(trimBandsStart([band({ start: 2, end: 4 })], 1, 4)!.map((b) => [b.start, b.end]), [[1, 3]]);
    assert.deepEqual(trimBandsEnd([band({ start: 2, end: 4 })], 3)!.map((b) => [b.start, b.end]), [[2, 3]]);
    assert.equal(trimBandsEnd([band({ start: 4, end: 5 })], 3)!.length, 0);
  });
  it("proyectos editados a mano: se limpian las capas inválidas", () => {
    const out = normalizeBands([null, { id: "a", kind: "nope" }, { id: "b", kind: "effect", ref: "scan", start: -2, end: 99, intensity: 3 }], 5)!;
    assert.equal(out.length, 1);
    assert.deepEqual([out[0]!.start, out[0]!.end, out[0]!.intensity], [0, 5, 1]);
    assert.equal(normalizeBands(undefined, 5), undefined);
  });
});

describe("0.0.16: normalizeBands recorta en vez de correr", () => {
  it("una capa que termina después del clip se recorta y conserva su inicio", () => {
    const [b] = normalizeBands([{ id: "z1", kind: "filter", ref: "warm", name: "W", start: 1, end: 99 }], 3)!;
    assert.equal(b.start, 1);
    assert.equal(b.end, 3);
  });
  it("descarta una capa que empieza después del final del clip", () => {
    assert.deepEqual(normalizeBands([{ id: "z2", kind: "filter", ref: "warm", start: 5, end: 9 }], 3), []);
  });
});
