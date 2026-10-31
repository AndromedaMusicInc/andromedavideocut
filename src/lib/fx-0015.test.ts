import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dropSpan, fxKindOf, lookSpan, playheadInto } from "./editor/look-span.ts";
import { fxLaneFor, fxNewLane } from "./editor/tracks.ts";
import type { Clip } from "./editor/types.ts";

const clip = (p: Partial<Clip>) => ({ id: "c", type: "generator", trackId: "lane1", start: 0, duration: 5, ...p }) as Clip;

// Layout del video de Wilhelm (0.0.14): Efectos y Canales fx arriba, Canal con "Ciudad neón", Base vacía.
const order = ["t1", "o1", "lane3", "lane2", "fx1", "lane1", "v1", "a1"];
const gens = [clip({ id: "n1", start: 0, duration: 4.9 }), clip({ id: "n2", start: 4.9, duration: 5 })];
const velocity = clip({ id: "vel", type: "fx", trackId: "fx1", start: 0, duration: 4, effect: "velocity" as Clip["effect"] });

describe("0.0.15: filtros/efectos encima del video, sin pisar barras", () => {
  it("nunca reemplaza una barra fx existente: si Efectos está ocupado crea otro canal arriba", () => {
    const lane = fxLaneFor(["t1", "o1", "fx1", "lane1", "v1", "a1"], [...gens, velocity], 0, 4.9, "fx1");
    assert.notEqual(lane.trackId, "fx1");
    assert.equal(lane.created, true);
    assert.ok(lane.order.indexOf(lane.trackId) < lane.order.indexOf("lane1"));
  });
  it("un canal fx debajo de un Canal con videos no sirve (quedaría tapado)", () => {
    const o = ["t1", "o1", "lane1", "fx1", "v1", "a1"];
    const lane = fxLaneFor(o, gens, 0, 4.9);
    assert.ok(lane.order.indexOf(lane.trackId) < lane.order.indexOf("lane1"));
  });
  it("'Canal nuevo' crea un canal nuevo en la línea elegida", () => {
    const lane = fxNewLane(order, [...gens, velocity], { mode: "before", trackId: "fx1" });
    assert.equal(lane.order.length, order.length + 1);
    assert.equal(lane.order.indexOf(lane.trackId), order.indexOf("fx1"));
  });
  it("'Canal nuevo' debajo de un Canal con videos sube encima de él", () => {
    const lane = fxNewLane(order, gens, { mode: "after", trackId: "lane1" });
    assert.ok(lane.order.indexOf(lane.trackId) < lane.order.indexOf("lane1"));
  });
  it("el cabezal queda dentro de la barra para que el visor muestre el filtro", () => {
    assert.equal(playheadInto(9.3, 0, 4), 0);
    assert.equal(playheadInto(2, 0, 4), 2);
  });
  it("soltar sobre el 2.º clip cubre ese clip", () => {
    assert.deepEqual([dropSpan(gens, "lane1", 9.3).start, dropSpan(gens, "lane1", 9.3).duration], [4.9, 5]);
  });
});

describe("0.0.15: dos clics seguidos quedan alineados (bug de QA)", () => {
  const base = clip({ id: "b", type: "video", trackId: "v1", start: 0, duration: 2 });
  const top = clip({ id: "t", type: "video", trackId: "lane1", start: 0.588, duration: 3 });
  const o = ["fx1", "lane1", "v1", "a1"];
  it("el primer clic toma la capa visible de arriba, no la Base", () => {
    assert.equal(lookSpan([base, top], 1.09, null, o).start, 0.588);
  });
  it("con la barra recién creada seleccionada, el segundo clic usa el mismo tramo", () => {
    const first = lookSpan([base, top], 1.09, null, o);
    const bar = clip({ id: "g", type: "fx", trackId: "fx1", start: first.start, duration: first.duration });
    const second = lookSpan([base, top, bar], 1.09, "g", o);
    assert.deepEqual([second.start, second.duration], [first.start, first.duration]);
  });
});

describe("0.0.15: el panel muestra lo que aplica la barra", () => {
  it("filtro, efecto o look", () => {
    assert.equal(fxKindOf({ filter: "portra800" as Clip["filter"], effect: "none" }), "filter");
    assert.equal(fxKindOf({ filter: "none", effect: "velocity" as Clip["effect"] }), "effect");
    assert.equal(fxKindOf({ filter: "none", effect: "none" }), "look");
  });
});
