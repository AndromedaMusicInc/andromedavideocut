import { mixer } from "@/lib/editor/audio";
import { audioWindow, pickMusicClip, type LyricLine } from "@/lib/editor/reel";
import { useEditor } from "@/lib/editor/store";
import { encodeWav } from "@/lib/editor/wav";

const MAX_SECONDS = 90;

export interface WordStamp {
  text: string;
  start: number;
  end: number;
}

export function groupWords(words: WordStamp[], maxWords = 5, pause = 0.42): LyricLine[] {
  const lines: LyricLine[] = [];
  let bucket: WordStamp[] = [];
  const flush = () => {
    if (!bucket.length) return;
    const text = bucket
      .map((word) => word.text.trim())
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const first = bucket[0];
    const last = bucket[bucket.length - 1];
    if (text && first && last) lines.push({ text, start: first.start, end: last.end });
    bucket = [];
  };
  for (const word of words) {
    const prev = bucket[bucket.length - 1];
    const gap = prev ? word.start - prev.end : 0;
    const punct = prev ? /[.!?…]$/.test(prev.text) : false;
    if (bucket.length && (bucket.length >= maxWords || gap > pause || punct)) flush();
    bucket.push(word);
  }
  flush();
  return lines;
}

export function readWords(payload: unknown): WordStamp[] {
  if (!payload || typeof payload !== "object") return [];
  const words = (payload as { words?: unknown }).words;
  if (!Array.isArray(words)) return [];
  const out: WordStamp[] = [];
  for (const item of words) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const text = String(row.text ?? row.word ?? "").trim();
    const start = Number(row.start ?? row.start_time);
    const end = Number(row.end ?? row.end_time);
    if (!text || !Number.isFinite(start)) continue;
    out.push({ text, start, end: Number.isFinite(end) && end > start ? end : start + 0.24 });
  }
  return out;
}

function apiUrl(path: string) {
  const prefix = import.meta.env.VITE_API_BASE ?? "";
  return `${prefix}${path}`;
}

export async function transcribeTimeline(): Promise<{ lines: LyricLine[]; lyrics: string; note: string }> {
  const state = useEditor.getState();
  const clip = pickMusicClip(state.clips, state.selectedId);
  if (!clip) return { lines: [], lyrics: "", note: "Suelta primero el audio o el video del tema." };
  if (clip.generator && !clip.assetId) {
    return { lines: [], lyrics: "", note: "Eso es un sonido de la app. Suelta la canción para leer la voz." };
  }
  if (!import.meta.env.VITE_API_BASE) {
    return { lines: [], lyrics: "", note: "En la versión web la letra automática no está disponible. Pega la letra a mano (una frase por línea)." };
  }
  await mixer.resume();
  const windowed = audioWindow(clip);
  if (!windowed || windowed.samples.length < windowed.rate * 0.4) {
    return { lines: [], lyrics: "", note: "No pude leer el audio. Vuelve a soltar el archivo." };
  }
  const capped = windowed.samples.length > windowed.rate * MAX_SECONDS;
  const wav = encodeWav(windowed.samples, windowed.rate, MAX_SECONDS);
  const response = await fetch(apiUrl("/api/transcribe"), {
    method: "POST",
    headers: { "Content-Type": "audio/wav" },
    body: wav,
  });
  const data = (await response.json().catch(() => null)) as { error?: string; text?: string; words?: unknown } | null;
  if (!response.ok) {
    return { lines: [], lyrics: "", note: data?.error || "No se pudo transcribir. Pega la letra a mano." };
  }
  const speed = clip.speed || 1;
  const words = readWords(data).map((word) => ({
    text: word.text,
    start: clip.start + word.start / speed,
    end: clip.start + word.end / speed,
  }));
  const lines: LyricLine[] = words.length
    ? groupWords(words)
    : (data?.text || "")
        .split(/\n+/)
        .map((text) => text.trim())
        .filter(Boolean)
        .map((text) => ({ text }));
  if (!lines.length) return { lines: [], lyrics: "", note: "No escuché voz en ese audio." };
  const lyrics = lines
    .map((line) =>
      line.start != null && line.end != null
        ? `${line.start.toFixed(2)} ${line.end.toFixed(2)} ${line.text}`
        : line.text,
    )
    .join("\n");
  const tail = capped ? " Solo los primeros 90 segundos." : "";
  return { lines, lyrics, note: `${lines.length} frases puestas al tiempo de la voz.${tail}` };
}
