// Pestañas del inspector del clip y su memoria (última pestaña usada).
export type InspectorTab = "colores" | "ems" | "ajustes" | "filtros";
export const INSPECTOR_TABS: { id: InspectorTab; label: string }[] = [
  { id: "colores", label: "Colores" },
  { id: "ems", label: "Entrada-Medio-Salida" },
  { id: "ajustes", label: "Ajustes" },
  { id: "filtros", label: "Filtros" },
];
export const TAB_KEY = "avc.inspectorTab";
const IDS = INSPECTOR_TABS.map((t) => t.id);
type Store = Pick<Storage, "getItem" | "setItem">;
const ls = (): Store | null => { try { return typeof localStorage !== "undefined" ? localStorage : null; } catch { return null; } };

export function loadInspectorTab(store: Store | null = ls()): InspectorTab {
  try { const v = store?.getItem(TAB_KEY); return IDS.includes(v as InspectorTab) ? (v as InspectorTab) : "ajustes"; } catch { return "ajustes"; }
}
export function saveInspectorTab(t: InspectorTab, store: Store | null = ls()) {
  try { store?.setItem(TAB_KEY, t); } catch { /* modo privado */ }
}
/** Flechas izq/der dan la vuelta; Inicio/Fin van a los extremos. */
export function nextTab(cur: InspectorTab, key: string): InspectorTab | null {
  const i = IDS.indexOf(cur);
  if (key === "ArrowRight") return IDS[(i + 1) % IDS.length];
  if (key === "ArrowLeft") return IDS[(i - 1 + IDS.length) % IDS.length];
  if (key === "Home") return IDS[0];
  if (key === "End") return IDS[IDS.length - 1];
  return null;
}
type Kind = "video" | "image" | "generator" | "audio" | "text" | "sticker" | "fx" | string;
/** Si la pestaña tiene controles para ese tipo de clip (si no, se muestra un aviso). */
export function tabHasContent(tab: InspectorTab, type: Kind) {
  const visual = type === "video" || type === "image" || type === "generator";
  if (tab === "colores") return visual || type === "text";
  if (tab === "filtros") return visual;
  return true;
}
