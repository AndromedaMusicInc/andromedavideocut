import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { claimOpening, openingEnabled, OPENING_PREF, OPENING_SEEN, setOpeningEnabled } from "./editor/opening.ts";

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m }; };
const broken = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); }, removeItem: () => { throw new Error("x"); } };

describe("opening clip B17", () => {
  it("se muestra la primera vez y marca la sesión", () => {
    const l = mem(), s = mem();
    assert.equal(claimOpening(l, s, false), true);
    assert.equal(s.m.get(OPENING_SEEN), "1");
  });
  it("una vez por sesión", () => {
    const l = mem(), s = mem();
    claimOpening(l, s, false);
    assert.equal(claimOpening(l, s, false), false);
  });
  it("apagado en Ajustes = localStorage avc.openingClip='off'", () => {
    const l = mem(), s = mem();
    setOpeningEnabled(l, false);
    assert.equal(l.m.get(OPENING_PREF), "off");
    assert.equal(openingEnabled(l), false);
    assert.equal(claimOpening(l, s, false), false);
    setOpeningEnabled(l, true);
    assert.equal(l.m.has(OPENING_PREF), false);
    assert.equal(claimOpening(l, s, false), true);
  });
  it("respeta prefers-reduced-motion (no se muestra ni marca la sesión)", () => {
    const l = mem(), s = mem();
    assert.equal(claimOpening(l, s, true), false);
    assert.equal(s.m.has(OPENING_SEEN), false);
  });
  it("sin almacenamiento disponible no rompe", () => {
    assert.equal(openingEnabled(broken), true);
    assert.doesNotThrow(() => claimOpening(broken, broken, false));
    assert.doesNotThrow(() => setOpeningEnabled(null, false));
  });
});
