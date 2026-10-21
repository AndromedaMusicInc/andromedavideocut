import type { Clip } from "@/lib/editor/types";

export const MID_Y = 0.5;
export const TOP_Y = 0.3;
export const BOT_Y = 0.7;

export type AlignWhere = "arriba" | "abajo" | "lados" | "medio";

export function yOffset(clip: Clip, cy: number) {
  if (clip.type === "text") return (cy - 0.5) / 0.32;
  if (clip.type === "sticker") return (cy - 0.46) / 0.32;
  return (cy - 0.5) / 0.36;
}

export function centerAt(clip: Clip, where: AlignWhere) {
  if (where === "lados") return { x: 0, y: clip.y ?? 0 };
  if (where === "arriba") return { x: 0, y: yOffset(clip, TOP_Y) };
  if (where === "abajo") return { x: 0, y: yOffset(clip, BOT_Y) };
  return { x: 0, y: yOffset(clip, MID_Y) };
}

export function alignMark(clip: Clip): AlignWhere | null {
  if (Math.abs(clip.x ?? 0) > 0.02) return null;
  const y = clip.y ?? 0;
  if (Math.abs(y - yOffset(clip, MID_Y)) < 0.02) return "medio";
  if (Math.abs(y - yOffset(clip, TOP_Y)) < 0.02) return "arriba";
  if (Math.abs(y - yOffset(clip, BOT_Y)) < 0.02) return "abajo";
  return "lados";
}
