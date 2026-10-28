// 0.0.7: abrir un proyecto guardado con clips en canales creados al arrastrar (lane2, lane3…) salía en negro.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_TRACK_ORDER, restoreTrackOrder } from "./editor/tracks.ts";

test("proyecto viejo sin trackOrder: los canales con clips vuelven al orden (caso real de Wilhelm)", () => {
  const clips = [{ trackId: "lane3" }, { trackId: "lane2" }, { trackId: "o1" }];
  const order = restoreTrackOrder(undefined, clips);
  for (const id of ["lane3", "lane2", "o1", "v1"]) assert.ok(order.includes(id), id);
  assert.ok(order.indexOf("lane3") < order.indexOf("v1"), "encima del video principal");
});

test("usa el orden guardado tal cual", () => {
  const saved = ["t1", "lane2", "o1", "fx1", "v1", "lane1", "a1"];
  assert.deepEqual(restoreTrackOrder(saved, [{ trackId: "lane2" }, { trackId: "lane1" }]), saved);
});

test("proyecto vacío: orden por defecto (no hereda canales del proyecto anterior)", () => {
  assert.deepEqual(restoreTrackOrder(undefined, []), DEFAULT_TRACK_ORDER);
  assert.deepEqual(restoreTrackOrder(["t1", "lane9", "o1", "fx1", "v1", "a1"], []), DEFAULT_TRACK_ORDER);
});

test("orden guardado incompleto: agrega lo que falte", () => {
  const order = restoreTrackOrder(["v1"], [{ trackId: "v2" }, { trackId: "a1" }]);
  for (const id of [...DEFAULT_TRACK_ORDER, "v2"]) assert.ok(order.includes(id), id);
});
