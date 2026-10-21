import { layoutLyrics, lyricClips } from "@/lib/editor/reel";
import {
  lookFields,
  makeClip,
  TEXT_LOOKS,
  uid,
  VISUALS,
  type Clip,
  type FilterId,
  type GeneratorId,
  type StickerId,
  type TransitionId,
} from "@/lib/editor/types";

export interface StudioPack {
  id: string;
  name: string;
  hint: string;
  gens: GeneratorId[];
  filter: FilterId;
  transition: TransitionId;
  sticker: StickerId;
  title: string;
  look: string;
}

export const STUDIO_PACKS: StudioPack[] = [
  {
    id: "estudio",
    name: "Estudio",
    hint: "Neón, luces y micro",
    gens: ["neon", "bokeh", "film"],
    filter: "neon",
    transition: "fade",
    sticker: "mic",
    title: "EN EL ESTUDIO",
    look: "neon",
  },
  {
    id: "calle",
    name: "Calle",
    hint: "Noche y corte seco",
    gens: ["neon", "dusk", "pulse"],
    filter: "night",
    transition: "glitch",
    sticker: "bolt",
    title: "DE NOCHE",
    look: "oro",
  },
  {
    id: "club",
    name: "Club",
    hint: "Pulso y flash",
    gens: ["pulse", "bokeh", "neon"],
    filter: "vivid",
    transition: "flash",
    sticker: "vinyl",
    title: "EL DROP",
    look: "poster",
  },
  {
    id: "oro",
    name: "Oro",
    hint: "Cálido, con corona",
    gens: ["dusk", "film", "bokeh"],
    filter: "amber",
    transition: "wipe",
    sticker: "crown",
    title: "ORO",
    look: "oro",
  },
];

function visualName(id: string) {
  return VISUALS.find((item) => item.id === id)?.name ?? "Clip";
}

export function assemblePack(pack: StudioPack, prompt: string, origin: number): Clip[] {
  const lines = prompt
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);
  const title = (lines[0] || pack.title).slice(0, 32);
  const rest = lines.slice(1);
  const seg = 2.5;
  const look = lookFields(TEXT_LOOKS.find((item) => item.id === pack.look) ?? TEXT_LOOKS[0]!);
  const clips: Clip[] = pack.gens.map((generator, index) =>
    makeClip({
      id: uid(),
      type: "generator",
      trackId: "v1",
      name: visualName(generator),
      start: Number((origin + index * seg).toFixed(3)),
      duration: seg,
      generator,
      filter: pack.filter,
      transition: index === 0 ? "none" : pack.transition,
      transitionDur: pack.transition === "flash" ? 0.16 : 0.4,
    }),
  );
  clips.push(
    makeClip({
      id: uid(),
      type: "text",
      trackId: "t1",
      role: "hook",
      name: "Hook",
      start: Number((origin + 0.12).toFixed(3)),
      duration: 2.2,
      text: title,
      fontSize: 84,
      y: -0.08,
      anim: "slam",
      align: "center",
      ...look,
    }),
  );
  if (rest.length) {
    const span = { start: origin + 2.3, end: origin + seg * pack.gens.length };
    const laid = layoutLyrics(
      rest.map((text) => ({ text })),
      [],
      span,
      1,
    );
    clips.push(...lyricClips(laid, "pie"));
  }
  clips.push(
    makeClip({
      id: uid(),
      type: "sticker",
      trackId: "o1",
      name: pack.sticker,
      start: Number((origin + seg).toFixed(3)),
      duration: seg,
      generator: pack.sticker,
      x: 0.22,
      y: -0.26,
    }),
  );
  return clips;
}
