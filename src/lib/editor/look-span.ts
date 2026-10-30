import type { Clip } from "@/lib/editor/types";

/** Tramo por defecto de un filtro/look puesto con clic: el clip visual bajo el cabezal, como setEffect. */
export function lookSpan(clips: Clip[], time: number, selectedId: string | null = null) {
  const visual = (clip: Clip) => clip.type === "video" || clip.type === "image" || clip.type === "generator";
  const selected = clips.find((clip) => clip.id === selectedId);
  const under = (clip: Clip) => time >= clip.start && time < clip.start + clip.duration;
  const target =
    selected && visual(selected) && under(selected)
      ? selected
      : clips.find((clip) => visual(clip) && clip.trackId === "v1" && under(clip)) ??
        clips.find((clip) => visual(clip) && under(clip));
  if (!target) return { start: Math.max(0, time), duration: 3, target: null };
  return { start: target.start, duration: Math.min(8, Math.max(1.2, target.duration)), target };
}
