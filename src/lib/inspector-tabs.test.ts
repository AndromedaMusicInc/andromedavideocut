import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { INSPECTOR_TABS, loadInspectorTab, nextTab, saveInspectorTab, tabHasContent, TAB_KEY } from "./editor/inspector-tabs.ts";

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };
describe("pestañas del inspector", () => {
  it("orden y nombres", () => assert.deepEqual(INSPECTOR_TABS.map((t) => t.label), ["Colores", "Entrada-Medio-Salida", "Ajustes", "Filtros"]));
  it("recuerda la última pestaña; valor raro = Ajustes", () => {
    const s = mem();
    assert.equal(loadInspectorTab(s), "ajustes");
    saveInspectorTab("filtros", s); assert.equal(loadInspectorTab(s), "filtros");
    s.setItem(TAB_KEY, "xx"); assert.equal(loadInspectorTab(s), "ajustes");
    assert.equal(loadInspectorTab(null), "ajustes");
  });
  it("teclado", () => {
    assert.equal(nextTab("filtros", "ArrowRight"), "colores");
    assert.equal(nextTab("colores", "ArrowLeft"), "filtros");
    assert.equal(nextTab("ajustes", "Home"), "colores");
    assert.equal(nextTab("colores", "End"), "filtros");
    assert.equal(nextTab("colores", "a"), null);
  });
  it("contenido por tipo", () => {
    assert.ok(tabHasContent("filtros", "video")); assert.ok(!tabHasContent("filtros", "audio"));
    assert.ok(!tabHasContent("colores", "audio")); assert.ok(tabHasContent("colores", "text"));
  });
});
