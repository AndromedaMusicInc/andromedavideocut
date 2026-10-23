import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { joinClips, snapMove, snapTo } from "./editor/time.ts";

const pps = 68; // zoom por defecto: umbral 8 px ≈ 0.1176 s
const c = (id: string, trackId: string, start: number, duration: number, type = "video") =>
  ({ id, trackId, start, duration, type, transition: "none", transitionDur: 0.5 }) as never;

describe("imán (snapMove)", () => {
  it("pega el inicio a un borde cercano (bug 0.0.3: nunca pegaba)", () => {
    assert.equal(snapMove(5.25, 3, [0, 5.2], pps), 5.2);
  });
  it("pega el final a un borde cercano", () => {
    assert.equal(snapMove(2.05, 3, [0, 5], pps), 2);
  });
  it("pega al cabezal", () => {
    assert.equal(snapMove(7.93, 2, [0, 8], pps), 8);
  });
  it("si nada está cerca, no mueve", () => {
    assert.equal(snapMove(3.5, 1, [0, 10], pps), 3.5);
  });
  it("elige el pegado más cercano entre inicio y fin", () => {
    assert.equal(snapMove(4.1, 2, [4, 6.05], pps), 4.05);
  });
  it("no deja inicio negativo", () => {
    assert.equal(snapMove(0.05, 1, [0.98], pps), 0);
  });
  it("no lo engaña el redondeo del borde final (caso real del demo)", () => {
    assert.equal(snapMove(5.264705882352941, 3, [0, 0, 0, 5.2, 5.2, 10.4, 0.35, 3.45, 3.55, 6.55, 0, 10.4], pps), 5.2);
  });
  it("snapTo sigue igual", () => {
    assert.equal(snapTo(1.05, [1], pps), 1);
  });
});

describe("cortes para transiciones (joinClips)", () => {
  it("solo cuenta clips visuales pegados en la misma pista", () => {
    const ids = joinClips([c("a", "v1", 0, 3), c("b", "v1", 3, 3), c("x", "v2", 3, 2), c("s", "a1", 0, 6, "audio")]).map((k: { id: string }) => k.id);
    assert.deepEqual(ids, ["b"]);
  });
  it("hueco > 0.25 s no es corte", () => {
    assert.equal(joinClips([c("a", "v1", 0, 3), c("b", "v1", 3.5, 3)]).length, 0);
  });
});
