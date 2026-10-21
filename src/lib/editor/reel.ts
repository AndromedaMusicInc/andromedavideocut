import { mixer, SAMPLE_RATE, synth } from "@/lib/editor/audio";
import { detectBeats, everyNth, type BeatGrid } from "@/lib/editor/beats";
import {
  lookFields,
  makeClip,
  TEXT_LOOKS,
  uid,
  type AspectId,
  type Clip,
  type FilterId,
  type TextAnim,
} from "@/lib/editor/types";

export type LyricStyle = "pie" | "centro" | "karaoke" | "hook";

export interface LyricLine {
  text: string;
  start?: number;
  end?: number;
}

export interface VegaPlan {
  title?: string;
  style?: LyricStyle;
  every?: 0 | 1 | 2 | 4;
  aspect?: AspectId;
  flash?: boolean;
  filter?: FilterId;
  bpm?: number;
  lyrics?: Array<string | { text?: string; t?: number; d?: number; start?: number; end?: number }>;
  cuts?: number[];
}

function styled(id: string) {
  return lookFields(TEXT_LOOKS.find((item) => item.id === id) ?? TEXT_LOOKS[0]!);
}

const STYLES: Record<LyricStyle, ReturnType<typeof lookFields> & { fontSize: number; y: number; anim: TextAnim; align: "center" }> = {
  pie: { ...styled("placa"), fontSize: 52, y: 0.32, anim: "slide", align: "center" },
  centro: { ...styled("limpio"), fontSize: 64, y: 0.02, anim: "pop", align: "center" },
  karaoke: { ...styled("neon"), fontSize: 56, y: 0.2, anim: "type", align: "center" },
  hook: { ...styled("oro"), fontSize: 88, y: -0.08, anim: "slam", align: "center" },
};

export function pickMusicClip(clips: Clip[], selectedId: string | null) {
  const selected = clips.find((clip) => clip.id === selectedId);
  if (selected && (selected.type === "audio" || selected.type === "video")) return selected;
  const audio = clips.filter((clip) => clip.type === "audio").sort((a, b) => b.duration - a.duration);
  return audio[0] ?? clips.find((clip) => clip.type === "video") ?? null;
}

export function audioWindow(clip: Clip) {
  if (clip.type === "audio" && clip.generator) {
    const all = synth(clip.generator);
    const start = Math.max(0, Math.floor(clip.inPoint * SAMPLE_RATE));
    const len = Math.max(1, Math.floor(clip.duration * (clip.speed || 1) * SAMPLE_RATE));
    return { samples: all.subarray(start, Math.min(all.length, start + len)), rate: SAMPLE_RATE };
  }
  const buffer = mixer.bufferFor(clip);
  if (!buffer) return null;
  const rate = buffer.sampleRate;
  const start = Math.max(0, Math.floor(clip.inPoint * rate));
  const len = Math.max(1, Math.floor(clip.duration * (clip.speed || 1) * rate));
  const channel = buffer.getChannelData(0);
  return { samples: channel.subarray(start, Math.min(channel.length, start + len)), rate };
}

export function gridOnTimeline(grid: BeatGrid, clip: Clip) {
  const speed = clip.speed || 1;
  return {
    bpm: grid.bpm,
    downbeat: grid.downbeat,
    beats: grid.beats.map((time) => Number((clip.start + time / speed).toFixed(3))),
  };
}

export function parseLyrics(raw: string): LyricLine[] {
  if (raw.includes("-->")) {
    const srt = parseSrt(raw);
    if (srt.length) return srt;
  }
  const stamp = "(?:\\d+:)?\\d+(?:\\.\\d+)?";
  const two = new RegExp(`^(${stamp})\\s+(${stamp})\\s+(.+)$`);
  const one = new RegExp(`^(${stamp})\\s+(\\S.*)$`);
  const lines: LyricLine[] = [];
  for (const row of raw.split(/\n+/)) {
    const line = row.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;
    const pair = line.match(two);
    if (pair?.[1] && pair[2] && pair[3]) {
      const start = parseStamp(pair[1]);
      const end = parseStamp(pair[2]);
      if (start != null && end != null && end > start) {
        lines.push({ text: pair[3].trim(), start, end });
        continue;
      }
    }
    const single = line.match(one);
    if (single?.[1] && single[2] && /[:.]/.test(single[1])) {
      const start = parseStamp(single[1]);
      if (start != null) {
        lines.push({ text: single[2].trim(), start });
        continue;
      }
    }
    lines.push({ text: line });
  }
  return lines;
}

function parseStamp(raw: string) {
  const match = raw.trim().match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const mins = match[1] ? Number(match[1]) : 0;
  const secs = Number(match[2]);
  if (!Number.isFinite(secs)) return null;
  return mins * 60 + secs;
}

function parseSrt(raw: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const block of raw.replace(/\r/g, "").split(/\n\s*\n/)) {
    const rows = block
      .split("\n")
      .map((row) => row.trim())
      .filter(Boolean);
    const stamp = rows.find((row) => row.includes("-->"));
    if (!stamp) continue;
    const [left, right] = stamp.split("-->");
    const start = left ? parseSrtStamp(left) : null;
    const end = right ? parseSrtStamp(right) : null;
    const text = rows.filter((row) => row !== stamp && !/^\d+$/.test(row)).join(" ").trim();
    if (start == null || !text) continue;
    lines.push({ text, start, end: end != null && end > start ? end : undefined });
  }
  return lines;
}

function parseSrtStamp(raw: string) {
  const match = raw.trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  if (!match) return parseStamp(raw.trim().split(/\s/)[0] ?? "");
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
}

export function layoutLyrics(
  lines: LyricLine[],
  beats: number[],
  span: { start: number; end: number },
  step: number,
) {
  const timed = lines.some((line) => line.start != null);
  if (timed) {
    return lines.map((line, index) => {
      const start = line.start ?? span.start + index * 1.4;
      const next = lines[index + 1]?.start;
      const end = line.end ?? next ?? start + 1.6;
      return { text: line.text, start, duration: Math.max(0.4, end - start) };
    });
  }
  const grid = beats.filter((time) => time >= span.start - 0.02 && time < span.end - 0.05);
  const marks = grid.length >= 2 ? everyNth(grid, 0, Math.max(1, step)) : [];
  if (marks.length >= 2) {
    return lines.map((line, index) => {
      const start = marks[Math.min(index, marks.length - 1)] ?? span.start;
      const next = marks[Math.min(index + 1, marks.length - 1)] ?? start + 1.5;
      const duration = index >= marks.length - 1 ? 1.6 : Math.max(0.45, next - start);
      return { text: line.text, start, duration };
    });
  }
  const length = Math.max(1.2, span.end - span.start);
  const slot = length / Math.max(1, lines.length);
  return lines.map((line, index) => ({
    text: line.text,
    start: span.start + index * slot,
    duration: Math.max(0.45, slot * 0.92),
  }));
}

export function lyricClips(lines: { text: string; start: number; duration: number }[], style: LyricStyle) {
  const look = STYLES[style];
  return lines
    .filter((line) => line.text.trim())
    .map((line) =>
      makeClip({
        id: uid(),
        type: "text",
        trackId: "t1",
        role: "lyric",
        name: line.text.trim().slice(0, 22),
        start: Number(line.start.toFixed(3)),
        duration: Number(Math.min(6, line.duration).toFixed(3)),
        text: line.text.trim(),
        ...look,
      }),
    );
}

export function hookClip(text: string) {
  const look = STYLES.hook;
  return makeClip({
    id: uid(),
    type: "text",
    trackId: "t1",
    role: "hook",
    name: "Hook",
    start: 0.12,
    duration: 2.2,
    text: text.slice(0, 42),
    ...look,
  });
}

export function splitTrack(clips: Clip[], times: number[], trackId: string, flash: boolean) {
  const cuts = [...times].filter((time) => time > 0.08).sort((a, b) => a - b).slice(0, 80);
  let current = clips.map((clip) => ({ ...clip }));
  for (const time of cuts) {
    const next: Clip[] = [];
    for (const clip of current) {
      if (clip.trackId !== trackId || time <= clip.start + 0.12 || time >= clip.start + clip.duration - 0.12) {
        next.push(clip);
        continue;
      }
      const left = time - clip.start;
      next.push({ ...clip, duration: left });
      next.push({
        ...clip,
        id: uid(),
        start: time,
        duration: clip.duration - left,
        inPoint: clip.inPoint + left * (clip.speed || 1),
        transition: flash ? "flash" : "none",
        transitionDur: flash ? 0.16 : clip.transitionDur,
      });
    }
    current = next;
  }
  return current;
}

export function parsePlan(raw: string): { plan?: VegaPlan; error?: string } {
  try {
    const data = JSON.parse(raw) as VegaPlan;
    if (!data || typeof data !== "object") return { error: "El plan tiene que ser un objeto." };
    return { plan: data };
  } catch {
    return { error: "Ese JSON no se puede leer." };
  }
}

export function linesFromPlan(plan: VegaPlan): LyricLine[] {
  if (!plan.lyrics?.length) return [];
  return plan.lyrics
    .map((item) => {
      if (typeof item === "string") return { text: item };
      const text = item.text?.trim() ?? "";
      if (!text) return null;
      const start = item.t ?? item.start;
      const end = item.end ?? (start != null && item.d != null ? start + item.d : undefined);
      return { text, start, end };
    })
    .filter((item): item is LyricLine => Boolean(item?.text));
}
