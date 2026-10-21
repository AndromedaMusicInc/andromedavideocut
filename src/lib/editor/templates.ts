import { everyNth } from "@/lib/editor/beats";
import { hookClip, layoutLyrics, lyricClips, parseLyrics, pickMusicClip, splitTrack, type LyricStyle } from "@/lib/editor/reel";
import { contentEnd } from "@/lib/editor/time";
import type { Clip, FilterId, TransitionId } from "@/lib/editor/types";

export interface TemplateInput {
  clips: Clip[];
  beats: number[];
  downbeat: number;
  lyrics: string;
  name: string;
}

export interface ReelTemplate {
  id: string;
  name: string;
  hint: string;
  apply: (input: TemplateInput) => { clips: Clip[]; message: string };
}

function spanOf(clips: Clip[]) {
  const music = pickMusicClip(clips, null);
  return {
    start: music?.start ?? 0,
    end: music ? music.start + music.duration : Math.max(contentEnd(clips), 8),
  };
}

function withLyrics(clips: Clip[], input: TemplateInput, style: LyricStyle, step: number) {
  const lines = parseLyrics(input.lyrics);
  if (!lines.length) return { clips, note: "Pega la letra para llenar las frases." };
  const laid = layoutLyrics(lines, input.beats, spanOf(clips), step);
  return {
    clips: [...clips.filter((clip) => clip.role !== "lyric"), ...lyricClips(laid, style)],
    note: `${lines.length} frases.`,
  };
}

function paint(clips: Clip[], filter?: FilterId, transition?: TransitionId) {
  return clips.map((clip) => {
    if (clip.trackId !== "v1") return clip;
    return {
      ...clip,
      filter: filter ?? clip.filter,
      transition: transition && clip.start > 0.05 ? transition : clip.transition,
      transitionDur: transition === "flash" ? 0.16 : transition === "zoom" ? 0.28 : transition ? 0.4 : clip.transitionDur,
    };
  });
}

function cut(clips: Clip[], input: TemplateInput, every: 1 | 2 | 4, flash: boolean) {
  if (input.beats.length < 2) return { clips, note: "Detecta el beat para cortar." };
  return { clips: splitTrack(clips, everyNth(input.beats, input.downbeat, every), "v1", flash), note: "Video cortado." };
}

export const REEL_TEMPLATES: ReelTemplate[] = [
  {
    id: "hook",
    name: "Hook",
    hint: "Título slam al inicio",
    apply: (input) => {
      const line = parseLyrics(input.lyrics)[0]?.text || input.name || "TU HOOK";
      const clips = [...input.clips.filter((clip) => clip.role !== "hook"), hookClip(line)];
      return { clips, message: "Hook listo. Edítalo en Ajustes." };
    },
  },
  {
    id: "letras",
    name: "Letras abajo",
    hint: "Placa, se lee en mute",
    apply: (input) => {
      const next = withLyrics(input.clips, input, "pie", 2);
      return { clips: next.clips, message: next.note };
    },
  },
  {
    id: "karaoke",
    name: "Karaoke",
    hint: "La frase se escribe al beat",
    apply: (input) => {
      const next = withLyrics(input.clips, input, "karaoke", 2);
      return { clips: next.clips, message: next.note };
    },
  },
  {
    id: "centro",
    name: "Centro",
    hint: "Frase grande al medio",
    apply: (input) => {
      const next = withLyrics(input.clips, input, "centro", 4);
      return { clips: next.clips, message: next.note };
    },
  },
  {
    id: "cortes",
    name: "Cortes",
    hint: "Parte el video cada 2 beats",
    apply: (input) => {
      const next = cut(input.clips, input, 2, false);
      return { clips: next.clips, message: next.note };
    },
  },
  {
    id: "doble",
    name: "Cada beat",
    hint: "Corte en cada golpe",
    apply: (input) => {
      const next = cut(input.clips, input, 1, false);
      return { clips: next.clips, message: next.note };
    },
  },
  {
    id: "drop",
    name: "Drop",
    hint: "Flash en cada 2 beats",
    apply: (input) => {
      const next = cut(paint(input.clips), input, 2, true);
      return { clips: next.clips, message: next.note };
    },
  },
  {
    id: "suave",
    name: "Suave",
    hint: "Fundido cada 4 beats",
    apply: (input) => {
      const base = paint(input.clips, undefined, "fade");
      const next = cut(base, input, 4, false);
      return { clips: next.clips, message: next.note === "Video cortado." ? "Cortes suaves cada 4 beats." : next.note };
    },
  },
  {
    id: "zoom",
    name: "Zoom",
    hint: "Empuje al entrar el corte",
    apply: (input) => {
      const base = paint(input.clips, undefined, "zoom");
      const next = cut(base, input, 2, false);
      return { clips: next.clips, message: next.note === "Video cortado." ? "Zoom en los cortes." : next.note };
    },
  },
  {
    id: "performance",
    name: "Performance",
    hint: "Look cine + letra abajo",
    apply: (input) => {
      const next = withLyrics(paint(input.clips, "cinema"), input, "pie", 4);
      return { clips: next.clips, message: `Look cine. ${next.note}` };
    },
  },
  {
    id: "story",
    name: "Story",
    hint: "Frases al centro, fundido",
    apply: (input) => {
      const next = withLyrics(paint(input.clips, undefined, "fade"), input, "centro", 4);
      return { clips: next.clips, message: next.note };
    },
  },
  {
    id: "oro",
    name: "Oro",
    hint: "Hook dorado + letra",
    apply: (input) => {
      const lines = parseLyrics(input.lyrics);
      let clips = input.clips.filter((clip) => clip.role !== "hook");
      clips.push(hookClip(lines[0]?.text || input.name || "TU HOOK"));
      const rest = lines.slice(1);
      if (rest.length) {
        const laid = layoutLyrics(
          rest,
          input.beats,
          spanOf(clips),
          2,
        );
        clips = [...clips.filter((clip) => clip.role !== "lyric"), ...lyricClips(laid, "pie")];
      }
      return { clips, message: rest.length ? "Hook y letras." : "Hook dorado. El resto de la letra va debajo." };
    },
  },
];
