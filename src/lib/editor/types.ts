import { FX_EFFECTS } from "@/lib/editor/fx-catalog";

export type AspectId = "9:16" | "16:9" | "1:1" | "4:5";
export type FilterId =
  | "none"
  | "warm"
  | "cool"
  | "mono"
  | "vintage"
  | "vivid"
  | "cinema"
  | "neon"
  | "amber"
  | "rose"
  | "ice"
  | "drama"
  | "matte"
  | "punch"
  | "night"
  | "forest"
  | "sunset"
  | "noir"
  | "bleach"
  | "teal"
  | "grain"
  | "vhs";
export type EffectId = string;
export type TransitionId =
  | "none"
  | "fade"
  | "wipe"
  | "slide"
  | "flash"
  | "zoom"
  | "circle"
  | "up"
  | "down"
  | "blur"
  | "glitch"
  | "black"
  | "spin"
  | "strobe"
  | "stretch"
  | "shred";
export type TextAnim = "none" | "fade" | "pop" | "slide" | "type" | "slam" | "bounce" | "glitch" | "retro";
export type EnterId = "none" | "fade" | "zoom" | "left" | "right" | "up" | "down" | "spin" | "pop" | "blur" | "bounce" | "drop" | "glitch";
export type MidId = "none" | "pulse" | "shake" | "sway" | "flicker" | "ken";
export type LeaveId = "none" | "fade" | "zoom" | "left" | "right" | "up" | "down" | "spin" | "pop" | "blur" | "bounce" | "glitch";
export type ClipType = "video" | "image" | "generator" | "audio" | "text" | "sticker" | "fx";
export type GeneratorId = "neon" | "tide" | "bokeh" | "film" | "pulse" | "dusk";
export type AudioGenId = "lofi" | "keys" | "air";
export type StickerId =
  | "star"
  | "ring"
  | "burst"
  | "badge"
  | "arrow"
  | "spark"
  | "note"
  | "heart"
  | "fire"
  | "bolt"
  | "mic"
  | "vinyl"
  | "crown"
  | "play";
export type ToolId =
  | "media"
  | "audio"
  | "text"
  | "stickers"
  | "filters"
  | "effects"
  | "transitions"
  | "adjust"
  | "reel"
  | "generate";

export interface Clip {
  id: string;
  type: ClipType;
  trackId: string;
  name: string;
  start: number;
  duration: number;
  inPoint: number;
  speed: number;
  volume: number;
  /** Desactivado (V): no se ve ni se oye, ni en la vista previa ni en la exportación. */
  disabled?: boolean;
  opacity: number;
  filter: FilterId;
  effect: EffectId;
  brightness: number;
  contrast: number;
  saturate: number;
  temperature: number;
  tint: number;
  wash: number;
  vignette: number;
  transition: TransitionId;
  transitionDur: number;
  fadeIn: number;
  fadeOut: number;
  fit: "cover" | "contain";
  assetId?: string;
  generator?: string;
  text?: string;
  fontSize?: number;
  color?: string;
  align?: "left" | "center" | "right";
  anim?: TextAnim;
  enter?: EnterId;
  middle?: MidId;
  leave?: LeaveId;
  enterDur?: number;
  leaveDur?: number;
  keyColor?: string;
  keyTol?: number;
  bold?: boolean;
  plate?: boolean;
  stroke?: string;
  strokeWidth?: number;
  shadow?: 0 | 1 | 2 | 3 | 4 | 5;
  shadowColor?: string;
  tracking?: number;
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  font?: string;
  role?: "lyric" | "hook";
}

export interface Asset {
  id: string;
  name: string;
  kind: "video" | "image" | "audio";
  duration: number;
  url?: string;
  thumb?: string;
  waveform?: string;
  /** Ruta del archivo original en el disco (solo app de escritorio). */
  path?: string;
}

export interface TrackDef {
  id: string;
  type: "video" | "overlay" | "text" | "audio";
  name: string;
}

export const TRACKS: TrackDef[] = [
  { id: "t1", type: "text", name: "Texto" },
  { id: "o1", type: "overlay", name: "Overlay" },
  { id: "v1", type: "video", name: "Video" },
  { id: "a1", type: "audio", name: "Audio" },
];

export const ASPECTS: Record<AspectId, { w: number; h: number; label: string; hint: string }> = {
  "9:16": { w: 1080, h: 1920, label: "9:16", hint: "Reels" },
  "16:9": { w: 1920, h: 1080, label: "16:9", hint: "YouTube" },
  "1:1": { w: 1080, h: 1080, label: "1:1", hint: "Post" },
  "4:5": { w: 1080, h: 1350, label: "4:5", hint: "Feed" },
};

export const FILTERS: { id: FilterId; name: string; css: string }[] = [
  { id: "none", name: "Original", css: "none" },
  { id: "warm", name: "Cálido", css: "sepia(0.4) saturate(1.25)" },
  { id: "cool", name: "Frío", css: "hue-rotate(18deg) saturate(0.9) brightness(1.05)" },
  { id: "mono", name: "B y N", css: "grayscale(1) contrast(1.12)" },
  { id: "vintage", name: "Vintage", css: "sepia(0.55) contrast(0.92) brightness(1.06)" },
  { id: "vivid", name: "Vivo", css: "saturate(1.65) contrast(1.08)" },
  { id: "cinema", name: "Cine", css: "contrast(1.16) saturate(0.82) brightness(0.96)" },
  { id: "neon", name: "Neón", css: "saturate(1.75) contrast(1.14) hue-rotate(-8deg)" },
  { id: "amber", name: "Ámbar", css: "sepia(0.62) saturate(1.45) brightness(1.05) hue-rotate(-12deg)" },
  { id: "rose", name: "Rosa", css: "sepia(0.28) hue-rotate(-28deg) saturate(1.3) brightness(1.05)" },
  { id: "ice", name: "Hielo", css: "saturate(0.62) hue-rotate(24deg) brightness(1.14) contrast(0.94)" },
  { id: "drama", name: "Drama", css: "contrast(1.48) saturate(0.68) brightness(0.9)" },
  { id: "matte", name: "Mate", css: "contrast(0.8) brightness(1.16) saturate(0.72)" },
  { id: "punch", name: "Punch", css: "contrast(1.3) saturate(1.6) brightness(1.02)" },
  { id: "night", name: "Noche", css: "brightness(0.7) contrast(1.28) saturate(0.8) hue-rotate(10deg)" },
  { id: "forest", name: "Bosque", css: "sepia(0.22) hue-rotate(46deg) saturate(1.12) contrast(1.06)" },
  { id: "sunset", name: "Atardecer", css: "sepia(0.48) saturate(1.55) hue-rotate(-18deg) brightness(1.05)" },
  { id: "noir", name: "Noir", css: "grayscale(1) contrast(1.5) brightness(0.88)" },
  { id: "bleach", name: "Bleach", css: "contrast(1.38) saturate(0.28) brightness(1.1)" },
  { id: "teal", name: "Teal", css: "sepia(0.4) hue-rotate(150deg) saturate(0.85) contrast(1.14)" },
  { id: "grain", name: "Grano", css: "contrast(1.08) saturate(0.88)" },
  { id: "vhs", name: "VHS", css: "contrast(1.22) saturate(1.28) hue-rotate(-8deg) brightness(1.04)" },
];

export const EFFECTS = FX_EFFECTS;

export const TRANSITIONS: { id: TransitionId; name: string }[] = [
  { id: "none", name: "Corte" },
  { id: "fade", name: "Fundido" },
  { id: "wipe", name: "Barrido" },
  { id: "slide", name: "Deslizar" },
  { id: "flash", name: "Flash" },
  { id: "zoom", name: "Zoom" },
  { id: "circle", name: "Iris" },
  { id: "up", name: "Subir" },
  { id: "down", name: "Bajar" },
  { id: "blur", name: "Desenfoque" },
  { id: "glitch", name: "Glitch" },
  { id: "black", name: "Negro" },
  { id: "spin", name: "Volteo" },
  { id: "strobe", name: "Estrobo" },
  { id: "stretch", name: "Estirar" },
  { id: "shred", name: "Desgarro" },
];

export const ENTERS: { id: EnterId; name: string }[] = [
  { id: "none", name: "Ninguna" },
  { id: "fade", name: "Fundido" },
  { id: "zoom", name: "Zoom" },
  { id: "left", name: "Izquierda" },
  { id: "right", name: "Derecha" },
  { id: "up", name: "Arriba" },
  { id: "down", name: "Abajo" },
  { id: "spin", name: "Giro" },
  { id: "pop", name: "Pop" },
  { id: "blur", name: "Desenfoque" },
  { id: "bounce", name: "Rebote" },
  { id: "drop", name: "Caída" },
  { id: "glitch", name: "Glitch" },
];

export const MIDS: { id: MidId; name: string }[] = [
  { id: "none", name: "Quieto" },
  { id: "pulse", name: "Pulso" },
  { id: "shake", name: "Temblor" },
  { id: "sway", name: "Balanceo" },
  { id: "flicker", name: "Parpadeo" },
  { id: "ken", name: "Acercar" },
];

export const LEAVES: { id: LeaveId; name: string }[] = [
  { id: "none", name: "Ninguna" },
  { id: "fade", name: "Fundido" },
  { id: "zoom", name: "Zoom" },
  { id: "left", name: "Izquierda" },
  { id: "right", name: "Derecha" },
  { id: "up", name: "Arriba" },
  { id: "down", name: "Abajo" },
  { id: "spin", name: "Giro" },
  { id: "pop", name: "Pop" },
  { id: "blur", name: "Desenfoque" },
  { id: "bounce", name: "Rebote" },
  { id: "glitch", name: "Glitch" },
];

export const TEXT_ANIMS: { id: TextAnim; name: string }[] = [
  { id: "none", name: "Quieta" },
  { id: "fade", name: "Fundido entra y sale" },
  { id: "pop", name: "Pop" },
  { id: "slide", name: "Deslizar" },
  { id: "type", name: "Escribiendo" },
  { id: "slam", name: "Slam" },
  { id: "bounce", name: "Rebote" },
  { id: "glitch", name: "Glitch" },
  { id: "retro", name: "Retro" },
];

export const TEXT_SHADOWS: { id: 0 | 1 | 2 | 3 | 4 | 5; name: string }[] = [
  { id: 0, name: "Sin sombra" },
  { id: 1, name: "Suave" },
  { id: 2, name: "Brillo" },
  { id: 3, name: "Dura" },
  { id: 4, name: "3D" },
  { id: 5, name: "Larga" },
];

export interface Grade {
  id: string;
  name: string;
  hint: string;
  group: string;
  swatch: string;
  patch: Pick<Clip, "filter" | "brightness" | "contrast" | "saturate" | "temperature" | "tint" | "wash" | "vignette">;
}

export const GRADES: Grade[] = [
  { id: "portra400", name: "Portra 400", hint: "Piel y sol", group: "Kodak", swatch: "linear-gradient(145deg,#fdba74,#fde68a 60%,#a8a29e)", patch: { filter: "warm", brightness: 1.06, contrast: 0.96, saturate: 0.92, temperature: 0.36, tint: 0.08, wash: 0.1, vignette: 0.12 } },
  { id: "portra160", name: "Portra 160", hint: "Fina y limpia", group: "Kodak", swatch: "linear-gradient(145deg,#fde68a,#fef3c7)", patch: { filter: "warm", brightness: 1.08, contrast: 0.94, saturate: 0.88, temperature: 0.28, tint: 0.06, wash: 0.12, vignette: 0.08 } },
  { id: "portra800", name: "Portra 800", hint: "Noche cálida", group: "Kodak", swatch: "linear-gradient(145deg,#f59e0b,#d97706)", patch: { filter: "amber", brightness: 1.02, contrast: 1.02, saturate: 0.9, temperature: 0.42, tint: 0.1, wash: 0.08, vignette: 0.2 } },
  { id: "ektar", name: "Ektar 100", hint: "Color vivo", group: "Kodak", swatch: "linear-gradient(145deg,#ef4444,#fbbf24)", patch: { filter: "vivid", brightness: 1.04, contrast: 1.12, saturate: 1.35, temperature: 0.22, tint: -0.04, wash: 0, vignette: 0.14 } },
  { id: "gold200", name: "Gold 200", hint: "Dorada clásica", group: "Kodak", swatch: "linear-gradient(145deg,#f59e0b,#fef3c7)", patch: { filter: "amber", brightness: 1.05, contrast: 1.04, saturate: 1.1, temperature: 0.38, tint: 0.06, wash: 0.06, vignette: 0.16 } },
  { id: "ultramax", name: "Ultramax 400", hint: "Consumo cálido", group: "Kodak", swatch: "linear-gradient(145deg,#fb923c,#fde68a)", patch: { filter: "warm", brightness: 1.04, contrast: 1.06, saturate: 1.15, temperature: 0.34, tint: 0.04, wash: 0.04, vignette: 0.14 } },
  { id: "colorplus", name: "ColorPlus", hint: "Barata y alegre", group: "Kodak", swatch: "linear-gradient(145deg,#fbbf24,#f97316)", patch: { filter: "vivid", brightness: 1.06, contrast: 1.08, saturate: 1.25, temperature: 0.3, tint: 0.02, wash: 0.02, vignette: 0.1 } },
  { id: "ektachrome", name: "Ektachrome 100", hint: "Diapositiva fría", group: "Kodak", swatch: "linear-gradient(145deg,#38bdf8,#fef3c7)", patch: { filter: "cool", brightness: 1.04, contrast: 1.14, saturate: 1.2, temperature: -0.12, tint: 0.08, wash: 0, vignette: 0.1 } },
  { id: "kodachrome", name: "Kodachrome 64", hint: "Rojo y verde", group: "Kodak", swatch: "linear-gradient(145deg,#dc2626,#65a30d)", patch: { filter: "vintage", brightness: 1.02, contrast: 1.16, saturate: 1.1, temperature: 0.18, tint: 0.12, wash: 0.04, vignette: 0.18 } },
  { id: "vision500t", name: "Vision3 500T", hint: "Tungsteno", group: "Kodak", swatch: "linear-gradient(145deg,#fbbf24,#1e3a8a)", patch: { filter: "amber", brightness: 0.98, contrast: 1.1, saturate: 0.95, temperature: 0.48, tint: -0.08, wash: 0.06, vignette: 0.24 } },
  { id: "vision250d", name: "Vision3 250D", hint: "Luz de día", group: "Kodak", swatch: "linear-gradient(145deg,#93c5fd,#fde68a)", patch: { filter: "cinema", brightness: 1.02, contrast: 1.08, saturate: 0.98, temperature: 0.08, tint: -0.02, wash: 0.04, vignette: 0.16 } },
  { id: "k2383", name: "2383 Print", hint: "Copia de cine", group: "Kodak", swatch: "linear-gradient(145deg,#fcd34d,#78716c)", patch: { filter: "vintage", brightness: 1.04, contrast: 1.06, saturate: 0.9, temperature: 0.2, tint: 0.04, wash: 0.1, vignette: 0.22 } },
  { id: "k2393", name: "2393", hint: "Print suave", group: "Kodak", swatch: "linear-gradient(145deg,#fde68a,#a8a29e)", patch: { filter: "warm", brightness: 1.06, contrast: 1.02, saturate: 0.85, temperature: 0.24, tint: 0.06, wash: 0.12, vignette: 0.18 } },
  { id: "pro400h", name: "Pro 400H", hint: "Fuji piel", group: "Fuji", swatch: "linear-gradient(145deg,#fca5a5,#bbf7d0)", patch: { filter: "rose", brightness: 1.06, contrast: 0.94, saturate: 0.88, temperature: 0.16, tint: 0.14, wash: 0.1, vignette: 0.1 } },
  { id: "superia400", name: "Superia 400", hint: "Verde y magenta", group: "Fuji", swatch: "linear-gradient(145deg,#4ade80,#e879f9)", patch: { filter: "forest", brightness: 1.02, contrast: 1.04, saturate: 1.05, temperature: 0.08, tint: 0.18, wash: 0.04, vignette: 0.14 } },
  { id: "superia800", name: "Superia 800", hint: "Noche Fuji", group: "Fuji", swatch: "linear-gradient(145deg,#22c55e,#a855f7)", patch: { filter: "forest", brightness: 0.98, contrast: 1.08, saturate: 1.1, temperature: 0.12, tint: 0.16, wash: 0.06, vignette: 0.22 } },
  { id: "velvia", name: "Velvia 50", hint: "Paisaje vivo", group: "Fuji", swatch: "linear-gradient(145deg,#16a34a,#dc2626)", patch: { filter: "vivid", brightness: 1.02, contrast: 1.18, saturate: 1.45, temperature: 0.06, tint: 0.04, wash: 0, vignette: 0.12 } },
  { id: "provia", name: "Provia 100F", hint: "Natural precisa", group: "Fuji", swatch: "linear-gradient(145deg,#86efac,#93c5fd)", patch: { filter: "none", brightness: 1.04, contrast: 1.04, saturate: 1.02, temperature: 0.02, tint: 0.02, wash: 0.02, vignette: 0.06 } },
  { id: "eterna3513", name: "Eterna 3513", hint: "Cine suave", group: "Fuji", swatch: "linear-gradient(145deg,#bbf7d0,#64748b)", patch: { filter: "forest", brightness: 1.02, contrast: 0.94, saturate: 0.82, temperature: -0.06, tint: 0.1, wash: 0.08, vignette: 0.16 } },
  { id: "f3510", name: "Fuji 3510", hint: "Print Fuji", group: "Fuji", swatch: "linear-gradient(145deg,#86efac,#a8a29e)", patch: { filter: "forest", brightness: 1.04, contrast: 0.96, saturate: 0.8, temperature: 0.04, tint: 0.08, wash: 0.1, vignette: 0.14 } },
  { id: "teal-orange", name: "Teal y naranja", hint: "Blockbuster", group: "Cine", swatch: "linear-gradient(135deg,#0e7490,#fb923c)", patch: { filter: "teal", brightness: 0.98, contrast: 1.2, saturate: 1.08, temperature: 0.28, tint: -0.18, wash: 0, vignette: 0.28 } },
  { id: "teal-soft", name: "Teal suave", hint: "Cine ligero", group: "Cine", swatch: "linear-gradient(135deg,#22d3ee,#fdba74)", patch: { filter: "teal", brightness: 1.02, contrast: 1.08, saturate: 0.95, temperature: 0.16, tint: -0.1, wash: 0.04, vignette: 0.16 } },
  { id: "teal-heavy", name: "Teal fuerte", hint: "Acción", group: "Cine", swatch: "linear-gradient(135deg,#0e7490,#ea580c)", patch: { filter: "teal", brightness: 0.94, contrast: 1.32, saturate: 1.2, temperature: 0.36, tint: -0.24, wash: 0, vignette: 0.36 } },
  { id: "teal-night", name: "Teal noche", hint: "Ciudad", group: "Cine", swatch: "linear-gradient(135deg,#164e63,#fb923c)", patch: { filter: "night", brightness: 0.88, contrast: 1.24, saturate: 1.05, temperature: 0.18, tint: -0.2, wash: 0, vignette: 0.4 } },
  { id: "teal-travel", name: "Teal viaje", hint: "Atardecer", group: "Cine", swatch: "linear-gradient(135deg,#06b6d4,#f97316)", patch: { filter: "sunset", brightness: 1.04, contrast: 1.14, saturate: 1.15, temperature: 0.32, tint: -0.12, wash: 0.02, vignette: 0.2 } },
  { id: "hollywood", name: "Hollywood", hint: "Bloque", group: "Cine", swatch: "linear-gradient(135deg,#0c4a6e,#f59e0b)", patch: { filter: "cinema", brightness: 0.96, contrast: 1.22, saturate: 1.1, temperature: 0.24, tint: -0.14, wash: 0, vignette: 0.3 } },
  { id: "cine-teal", name: "Cine teal", hint: "Estándar", group: "Cine", swatch: "linear-gradient(135deg,#0891b2,#fbbf24)", patch: { filter: "teal", brightness: 1, contrast: 1.16, saturate: 1.02, temperature: 0.2, tint: -0.12, wash: 0.02, vignette: 0.22 } },
  { id: "split-ot", name: "Split naranja", hint: "Mitad y mitad", group: "Cine", swatch: "linear-gradient(90deg,#0e7490 50%,#fb923c 50%)", patch: { filter: "teal", brightness: 0.98, contrast: 1.18, saturate: 1.12, temperature: 0.3, tint: -0.16, wash: 0, vignette: 0.24 } },
  { id: "action-to", name: "Acción TO", hint: "Trailer", group: "Cine", swatch: "linear-gradient(135deg,#155e75,#c2410c)", patch: { filter: "drama", brightness: 0.92, contrast: 1.36, saturate: 1.18, temperature: 0.34, tint: -0.2, wash: 0, vignette: 0.38 } },
  { id: "thriller-teal", name: "Thriller teal", hint: "Tensión", group: "Cine", swatch: "linear-gradient(135deg,#164e63,#0f172a)", patch: { filter: "night", brightness: 0.86, contrast: 1.28, saturate: 0.85, temperature: 0.08, tint: -0.16, wash: 0, vignette: 0.42 } },
  { id: "golden-hour", name: "Hora dorada", hint: "Sol bajo", group: "Cálido", swatch: "linear-gradient(180deg,#f59e0b,#fef3c7)", patch: { filter: "sunset", brightness: 1.08, contrast: 1.04, saturate: 1.15, temperature: 0.48, tint: 0.06, wash: 0.08, vignette: 0.14 } },
  { id: "warm-punch", name: "Warm punch", hint: "Contraste cálido", group: "Cálido", swatch: "linear-gradient(145deg,#ea580c,#fde68a)", patch: { filter: "amber", brightness: 1.02, contrast: 1.22, saturate: 1.25, temperature: 0.4, tint: 0.02, wash: 0, vignette: 0.18 } },
  { id: "soft-warm", name: "Cálido suave", hint: "Piel", group: "Cálido", swatch: "linear-gradient(145deg,#fdba74,#fef3c7)", patch: { filter: "warm", brightness: 1.08, contrast: 0.94, saturate: 0.95, temperature: 0.28, tint: 0.08, wash: 0.1, vignette: 0.1 } },
  { id: "golden-glow", name: "Brillo dorado", hint: "Halo", group: "Cálido", swatch: "linear-gradient(145deg,#fbbf24,#fffbeb)", patch: { filter: "amber", brightness: 1.1, contrast: 0.98, saturate: 1.05, temperature: 0.36, tint: 0.04, wash: 0.14, vignette: 0.08 } },
  { id: "amber-warm", name: "Ámbar cálido", hint: "Tungsteno", group: "Cálido", swatch: "linear-gradient(145deg,#d97706,#fef3c7)", patch: { filter: "amber", brightness: 1.02, contrast: 1.06, saturate: 0.98, temperature: 0.44, tint: 0.02, wash: 0.06, vignette: 0.2 } },
  { id: "sunset-warm", name: "Atardecer", hint: "Rojo y oro", group: "Cálido", swatch: "linear-gradient(145deg,#dc2626,#fbbf24)", patch: { filter: "sunset", brightness: 1.04, contrast: 1.12, saturate: 1.2, temperature: 0.5, tint: 0.08, wash: 0.04, vignette: 0.22 } },
  { id: "lifestyle-warm", name: "Lifestyle", hint: "Vlog cálido", group: "Cálido", swatch: "linear-gradient(145deg,#fb923c,#fde68a)", patch: { filter: "warm", brightness: 1.06, contrast: 1.02, saturate: 1.08, temperature: 0.32, tint: 0.04, wash: 0.06, vignette: 0.1 } },
  { id: "cozy-warm", name: "Acogedor", hint: "Interior", group: "Cálido", swatch: "linear-gradient(145deg,#b45309,#fef3c7)", patch: { filter: "amber", brightness: 1.04, contrast: 0.98, saturate: 0.9, temperature: 0.4, tint: 0.06, wash: 0.1, vignette: 0.18 } },
  { id: "food-warm", name: "Comida", hint: "Apetitoso", group: "Cálido", swatch: "linear-gradient(145deg,#ea580c,#fbbf24)", patch: { filter: "vivid", brightness: 1.06, contrast: 1.08, saturate: 1.2, temperature: 0.36, tint: 0.04, wash: 0.02, vignette: 0.08 } },
  { id: "wedding-warm", name: "Boda cálida", hint: "Suave y oro", group: "Cálido", swatch: "linear-gradient(145deg,#fde68a,#fff7ed)", patch: { filter: "warm", brightness: 1.1, contrast: 0.92, saturate: 0.88, temperature: 0.26, tint: 0.08, wash: 0.12, vignette: 0.1 } },
  { id: "moody-desat", name: "Moody desat", hint: "Apagado", group: "Moody", swatch: "linear-gradient(160deg,#475569,#1e293b)", patch: { filter: "cinema", brightness: 0.96, contrast: 1.12, saturate: 0.55, temperature: -0.06, tint: 0.02, wash: 0.16, vignette: 0.28 } },
  { id: "moody-cine", name: "Moody cine", hint: "Oscuro", group: "Moody", swatch: "linear-gradient(160deg,#334155,#0f172a)", patch: { filter: "drama", brightness: 0.9, contrast: 1.24, saturate: 0.62, temperature: -0.08, tint: 0.04, wash: 0.1, vignette: 0.36 } },
  { id: "dark-teal", name: "Teal oscuro", hint: "Noche fría", group: "Moody", swatch: "linear-gradient(160deg,#164e63,#020617)", patch: { filter: "night", brightness: 0.84, contrast: 1.28, saturate: 0.7, temperature: -0.16, tint: -0.08, wash: 0, vignette: 0.42 } },
  { id: "moody-blue", name: "Moody azul", hint: "Melancólico", group: "Moody", swatch: "linear-gradient(160deg,#1e40af,#0f172a)", patch: { filter: "cool", brightness: 0.92, contrast: 1.16, saturate: 0.68, temperature: -0.22, tint: 0.06, wash: 0.08, vignette: 0.32 } },
  { id: "moody-green", name: "Moody verde", hint: "Bosque", group: "Moody", swatch: "linear-gradient(160deg,#14532d,#0f172a)", patch: { filter: "forest", brightness: 0.88, contrast: 1.2, saturate: 0.72, temperature: -0.1, tint: 0.12, wash: 0.06, vignette: 0.34 } },
  { id: "bleach", name: "Bleach bypass", hint: "Contraste de guerra", group: "Moody", swatch: "linear-gradient(160deg,#d6d3d1,#52525b)", patch: { filter: "bleach", brightness: 1.02, contrast: 1.28, saturate: 0.55, temperature: 0.06, tint: -0.04, wash: 0.12, vignette: 0.22 } },
  { id: "matte-fade", name: "Mate fade", hint: "Levantado", group: "Moody", swatch: "linear-gradient(160deg,#a8a29e,#44403c)", patch: { filter: "matte", brightness: 1.06, contrast: 0.82, saturate: 0.7, temperature: 0.04, tint: 0.02, wash: 0.2, vignette: 0.12 } },
  { id: "desat-film", name: "Film desat", hint: "Analógico", group: "Moody", swatch: "linear-gradient(160deg,#78716c,#292524)", patch: { filter: "vintage", brightness: 1, contrast: 1.04, saturate: 0.58, temperature: 0.1, tint: 0.02, wash: 0.14, vignette: 0.24 } },
  { id: "dark-urban", name: "Urbano oscuro", hint: "Ciudad", group: "Moody", swatch: "linear-gradient(160deg,#1f2937,#030712)", patch: { filter: "night", brightness: 0.86, contrast: 1.22, saturate: 0.65, temperature: -0.08, tint: 0.02, wash: 0.04, vignette: 0.4 } },
  { id: "low-key", name: "Low key", hint: "Sombras", group: "Moody", swatch: "linear-gradient(160deg,#374151,#030712)", patch: { filter: "drama", brightness: 0.82, contrast: 1.34, saturate: 0.6, temperature: -0.04, tint: 0, wash: 0, vignette: 0.48 } },
  { id: "vintage-film", name: "Vintage film", hint: "35mm", group: "Vintage", swatch: "linear-gradient(145deg,#fcd34d,#a8a29e)", patch: { filter: "vintage", brightness: 1.04, contrast: 1.02, saturate: 0.85, temperature: 0.22, tint: 0.06, wash: 0.08, vignette: 0.2 } },
  { id: "vintage-35", name: "Vintage 35mm", hint: "Grano y fade", group: "Vintage", swatch: "linear-gradient(145deg,#fde68a,#78716c)", patch: { filter: "grain", brightness: 1.02, contrast: 1.06, saturate: 0.82, temperature: 0.18, tint: 0.04, wash: 0.1, vignette: 0.24 } },
  { id: "vintage-vhs", name: "Vintage VHS", hint: "Cinta", group: "Vintage", swatch: "linear-gradient(145deg,#e879f9,#22d3ee)", patch: { filter: "vhs", brightness: 1.02, contrast: 1.14, saturate: 1.2, temperature: -0.02, tint: 0.22, wash: 0.04, vignette: 0.18 } },
  { id: "faded-vintage", name: "Faded", hint: "Desvanecido", group: "Vintage", swatch: "linear-gradient(145deg,#e7e5e4,#a8a29e)", patch: { filter: "matte", brightness: 1.08, contrast: 0.88, saturate: 0.72, temperature: 0.14, tint: 0.04, wash: 0.16, vignette: 0.12 } },
  { id: "retro70s", name: "Retro 70s", hint: "Naranja y marrón", group: "Vintage", swatch: "linear-gradient(145deg,#c2410c,#fef3c7)", patch: { filter: "amber", brightness: 1.02, contrast: 1.08, saturate: 0.95, temperature: 0.42, tint: 0.08, wash: 0.06, vignette: 0.22 } },
  { id: "retro80s", name: "Retro 80s", hint: "Magenta y cian", group: "Vintage", swatch: "linear-gradient(135deg,#e879f9,#22d3ee)", patch: { filter: "vhs", brightness: 1.02, contrast: 1.14, saturate: 1.25, temperature: -0.05, tint: 0.28, wash: 0.05, vignette: 0.22 } },
  { id: "analog-grain", name: "Grano analógico", hint: "Textura", group: "Vintage", swatch: "linear-gradient(145deg,#d6d3d1,#57534e)", patch: { filter: "grain", brightness: 1, contrast: 1.1, saturate: 0.78, temperature: 0.08, tint: 0.02, wash: 0.08, vignette: 0.2 } },
  { id: "expired", name: "Expired film", hint: "Vencida", group: "Vintage", swatch: "linear-gradient(145deg,#fca5a5,#86efac)", patch: { filter: "rose", brightness: 1.04, contrast: 0.98, saturate: 0.8, temperature: 0.12, tint: 0.16, wash: 0.1, vignette: 0.16 } },
  { id: "soft-vintage", name: "Vintage suave", hint: "Memoria", group: "Vintage", swatch: "linear-gradient(145deg,#fde68a,#fef3c7)", patch: { filter: "warm", brightness: 1.08, contrast: 0.92, saturate: 0.8, temperature: 0.24, tint: 0.06, wash: 0.12, vignette: 0.1 } },
  { id: "nostalgic", name: "Nostálgico", hint: "Fade cálido", group: "Vintage", swatch: "linear-gradient(145deg,#fdba74,#e7e5e4)", patch: { filter: "vintage", brightness: 1.06, contrast: 0.94, saturate: 0.75, temperature: 0.2, tint: 0.04, wash: 0.14, vignette: 0.14 } },
  { id: "clean-bright", name: "Limpio brillante", hint: "Comercial", group: "Limpio", swatch: "linear-gradient(145deg,#f8fafc,#e2e8f0)", patch: { filter: "none", brightness: 1.12, contrast: 1.04, saturate: 1.02, temperature: 0.04, tint: 0, wash: 0.04, vignette: 0 } },
  { id: "vlog-crisp", name: "Vlog crisp", hint: "YouTube", group: "Limpio", swatch: "linear-gradient(145deg,#fff,#f1f5f9)", patch: { filter: "none", brightness: 1.08, contrast: 1.08, saturate: 1.05, temperature: 0.06, tint: 0.02, wash: 0, vignette: 0.04 } },
  { id: "natural", name: "Natural", hint: "Sin filtro", group: "Limpio", swatch: "linear-gradient(145deg,#fef3c7,#bbf7d0)", patch: { filter: "none", brightness: 1.02, contrast: 1.02, saturate: 1, temperature: 0.02, tint: 0, wash: 0, vignette: 0 } },
  { id: "soft-pastel", name: "Pastel suave", hint: "Simétrico", group: "Limpio", swatch: "linear-gradient(135deg,#fecdd3,#bae6fd)", patch: { filter: "matte", brightness: 1.1, contrast: 0.86, saturate: 0.78, temperature: 0.12, tint: 0.06, wash: 0.16, vignette: 0.08 } },
  { id: "clean-commercial", name: "Comercial", hint: "Producto", group: "Limpio", swatch: "linear-gradient(145deg,#f8fafc,#cbd5e1)", patch: { filter: "none", brightness: 1.1, contrast: 1.06, saturate: 0.98, temperature: 0.02, tint: 0, wash: 0.02, vignette: 0.04 } },
  { id: "bright-airy", name: "Aireado", hint: "Luz alta", group: "Limpio", swatch: "linear-gradient(145deg,#fff,#e0f2fe)", patch: { filter: "ice", brightness: 1.14, contrast: 0.92, saturate: 0.85, temperature: -0.04, tint: 0.04, wash: 0.12, vignette: 0.04 } },
  { id: "minimal-clean", name: "Minimal", hint: "Blanco", group: "Limpio", swatch: "linear-gradient(145deg,#fff,#f8fafc)", patch: { filter: "none", brightness: 1.12, contrast: 0.96, saturate: 0.9, temperature: 0, tint: 0, wash: 0.06, vignette: 0 } },
  { id: "skin-safe", name: "Piel segura", hint: "Natural", group: "Limpio", swatch: "linear-gradient(145deg,#fde68a,#fca5a5)", patch: { filter: "warm", brightness: 1.04, contrast: 1, saturate: 0.95, temperature: 0.16, tint: 0.06, wash: 0.04, vignette: 0.06 } },
  { id: "doc-natural", name: "Documental", hint: "Real", group: "Limpio", swatch: "linear-gradient(145deg,#e2e8f0,#cbd5e1)", patch: { filter: "cinema", brightness: 1, contrast: 1.04, saturate: 0.88, temperature: 0.02, tint: 0, wash: 0.04, vignette: 0.08 } },
  { id: "soft-portrait", name: "Retrato suave", hint: "Piel", group: "Limpio", swatch: "linear-gradient(145deg,#fecdd3,#fef3c7)", patch: { filter: "rose", brightness: 1.08, contrast: 0.92, saturate: 0.85, temperature: 0.18, tint: 0.08, wash: 0.1, vignette: 0.1 } },
  { id: "neon-nights", name: "Neon nights", hint: "Ciudad", group: "Urbano", swatch: "linear-gradient(150deg,#6d28d9,#00d4c8)", patch: { filter: "neon", brightness: 0.9, contrast: 1.22, saturate: 1.4, temperature: -0.16, tint: 0.22, wash: 0, vignette: 0.4 } },
  { id: "urban-dark", name: "Urban dark", hint: "Noche", group: "Urbano", swatch: "linear-gradient(160deg,#1f2937,#030712)", patch: { filter: "night", brightness: 0.84, contrast: 1.26, saturate: 0.75, temperature: -0.1, tint: 0.04, wash: 0, vignette: 0.44 } },
  { id: "cyberpunk", name: "Cyberpunk", hint: "Magenta y cian", group: "Urbano", swatch: "linear-gradient(135deg,#ec4899,#06b6d4)", patch: { filter: "neon", brightness: 0.88, contrast: 1.28, saturate: 1.45, temperature: -0.08, tint: 0.3, wash: 0, vignette: 0.36 } },
  { id: "cool-blue", name: "Cool blue", hint: "Frío", group: "Urbano", swatch: "linear-gradient(160deg,#1e40af,#93c5fd)", patch: { filter: "ice", brightness: 0.96, contrast: 1.12, saturate: 0.95, temperature: -0.28, tint: 0.08, wash: 0.04, vignette: 0.22 } },
  { id: "ice-blue", name: "Ice blue", hint: "Hielo", group: "Urbano", swatch: "linear-gradient(160deg,#0ea5e9,#e0f2fe)", patch: { filter: "ice", brightness: 1.04, contrast: 1.08, saturate: 0.8, temperature: -0.32, tint: 0.06, wash: 0.08, vignette: 0.16 } },
  { id: "city-night", name: "City night", hint: "Farolas", group: "Urbano", swatch: "linear-gradient(160deg,#1e3a8a,#fbbf24)", patch: { filter: "night", brightness: 0.9, contrast: 1.18, saturate: 0.9, temperature: 0.12, tint: -0.06, wash: 0, vignette: 0.36 } },
  { id: "neon-magenta", name: "Neon magenta", hint: "Club", group: "Urbano", swatch: "linear-gradient(150deg,#ec4899,#7c3aed)", patch: { filter: "neon", brightness: 0.92, contrast: 1.2, saturate: 1.35, temperature: -0.04, tint: 0.28, wash: 0, vignette: 0.34 } },
  { id: "cold-sterile", name: "Estéril", hint: "Hospital", group: "Urbano", swatch: "linear-gradient(160deg,#cbd5e1,#64748b)", patch: { filter: "cool", brightness: 1.02, contrast: 1.06, saturate: 0.5, temperature: -0.18, tint: 0.02, wash: 0.14, vignette: 0.12 } },
  { id: "urban-pulse", name: "Urban pulse", hint: "Energía", group: "Urbano", swatch: "linear-gradient(135deg,#7c3aed,#f97316)", patch: { filter: "vivid", brightness: 0.96, contrast: 1.24, saturate: 1.3, temperature: 0.12, tint: 0.14, wash: 0, vignette: 0.28 } },
  { id: "night-cine", name: "Night cinematic", hint: "Noche cine", group: "Urbano", swatch: "linear-gradient(160deg,#0f172a,#1e3a8a)", patch: { filter: "night", brightness: 0.86, contrast: 1.2, saturate: 0.8, temperature: -0.12, tint: 0.04, wash: 0.04, vignette: 0.4 } },
  { id: "scroll-stop", name: "Scroll stopper", hint: "Thumb", group: "Especial", swatch: "linear-gradient(135deg,#f43f5e,#8b5cf6)", patch: { filter: "vivid", brightness: 1.04, contrast: 1.28, saturate: 1.4, temperature: 0.08, tint: 0.16, wash: 0, vignette: 0.16 } },
  { id: "cine-green", name: "Cine verde", hint: "Matrix", group: "Especial", swatch: "linear-gradient(160deg,#14532d,#22c55e)", patch: { filter: "forest", brightness: 0.94, contrast: 1.2, saturate: 1.1, temperature: -0.08, tint: 0.16, wash: 0, vignette: 0.3 } },
  { id: "blockbuster", name: "Blockbuster", hint: "Trailer", group: "Especial", swatch: "linear-gradient(135deg,#0c4a6e,#ea580c)", patch: { filter: "drama", brightness: 0.94, contrast: 1.3, saturate: 1.12, temperature: 0.28, tint: -0.16, wash: 0, vignette: 0.34 } },
  { id: "film-look", name: "Film look", hint: "Genérico", group: "Especial", swatch: "linear-gradient(145deg,#fcd34d,#64748b)", patch: { filter: "cinema", brightness: 1.02, contrast: 1.1, saturate: 0.9, temperature: 0.12, tint: 0.02, wash: 0.06, vignette: 0.2 } },
  { id: "cine-std", name: "Cine estándar", hint: "Base", group: "Especial", swatch: "linear-gradient(145deg,#94a3b8,#1e293b)", patch: { filter: "cinema", brightness: 1, contrast: 1.12, saturate: 0.88, temperature: 0.06, tint: -0.02, wash: 0.04, vignette: 0.18 } },
  { id: "true-cine", name: "True cinematic", hint: "Rec.709", group: "Especial", swatch: "linear-gradient(145deg,#e2e8f0,#334155)", patch: { filter: "cinema", brightness: 1, contrast: 1.08, saturate: 0.92, temperature: 0.04, tint: 0, wash: 0.02, vignette: 0.14 } },
  { id: "cine-emul", name: "Emulación film", hint: "Print", group: "Especial", swatch: "linear-gradient(145deg,#fde68a,#78716c)", patch: { filter: "vintage", brightness: 1.02, contrast: 1.06, saturate: 0.88, temperature: 0.16, tint: 0.04, wash: 0.08, vignette: 0.2 } },
  { id: "bw-classic", name: "B y N clásico", hint: "Plata", group: "Especial", swatch: "linear-gradient(160deg,#e5e5e5,#404040)", patch: { filter: "mono", brightness: 1.02, contrast: 1.12, saturate: 0, temperature: 0, tint: 0, wash: 0.04, vignette: 0.2 } },
  { id: "bw-contrast", name: "B y N alto", hint: "Contraste", group: "Especial", swatch: "linear-gradient(160deg,#fff,#171717)", patch: { filter: "noir", brightness: 0.96, contrast: 1.45, saturate: 0, temperature: 0, tint: 0, wash: 0, vignette: 0.28 } },
  { id: "sepia", name: "Sepia", hint: "Antiguo", group: "Especial", swatch: "linear-gradient(145deg,#d6d3d1,#a8a29e)", patch: { filter: "vintage", brightness: 1.04, contrast: 1.02, saturate: 0.4, temperature: 0.36, tint: 0.08, wash: 0.08, vignette: 0.24 } },
  { id: "food-toner", name: "Food toner", hint: "Comida", group: "Especial", swatch: "linear-gradient(145deg,#ea580c,#fbbf24)", patch: { filter: "vivid", brightness: 1.06, contrast: 1.1, saturate: 1.22, temperature: 0.34, tint: 0.02, wash: 0, vignette: 0.06 } },
  { id: "wedding-soft", name: "Boda suave", hint: "Pastel", group: "Especial", swatch: "linear-gradient(145deg,#fecdd3,#fef3c7)", patch: { filter: "rose", brightness: 1.1, contrast: 0.9, saturate: 0.82, temperature: 0.2, tint: 0.08, wash: 0.12, vignette: 0.08 } },
  { id: "travel-vibrant", name: "Viaje vivo", hint: "Destino", group: "Especial", swatch: "linear-gradient(145deg,#06b6d4,#f97316)", patch: { filter: "vivid", brightness: 1.04, contrast: 1.14, saturate: 1.3, temperature: 0.18, tint: -0.04, wash: 0, vignette: 0.12 } },
  { id: "landscape-warm", name: "Paisaje cálido", hint: "Montaña", group: "Especial", swatch: "linear-gradient(145deg,#16a34a,#f59e0b)", patch: { filter: "sunset", brightness: 1.04, contrast: 1.12, saturate: 1.18, temperature: 0.28, tint: 0.02, wash: 0.02, vignette: 0.16 } },
  { id: "horror-green", name: "Horror verde", hint: "Terror", group: "Especial", swatch: "linear-gradient(160deg,#14532d,#052e16)", patch: { filter: "forest", brightness: 0.82, contrast: 1.32, saturate: 0.85, temperature: -0.14, tint: 0.2, wash: 0, vignette: 0.48 } },
  { id: "horror-blue", name: "Horror azul", hint: "Frío", group: "Especial", swatch: "linear-gradient(160deg,#1e3a8a,#020617)", patch: { filter: "night", brightness: 0.8, contrast: 1.3, saturate: 0.7, temperature: -0.24, tint: 0.06, wash: 0, vignette: 0.46 } },
  { id: "dreamy-soft", name: "Dreamy", hint: "Sueño", group: "Especial", swatch: "linear-gradient(145deg,#fbcfe8,#e0f2fe)", patch: { filter: "matte", brightness: 1.12, contrast: 0.84, saturate: 0.75, temperature: 0.1, tint: 0.1, wash: 0.18, vignette: 0.08 } },
  { id: "high-punch", name: "Alto punch", hint: "Impacto", group: "Especial", swatch: "linear-gradient(135deg,#ef4444,#fbbf24)", patch: { filter: "punch", brightness: 1.02, contrast: 1.36, saturate: 1.45, temperature: 0.14, tint: 0.06, wash: 0, vignette: 0.14 } },
  { id: "matte-lift", name: "Mate lift", hint: "Negros altos", group: "Especial", swatch: "linear-gradient(160deg,#d6d3d1,#57534e)", patch: { filter: "matte", brightness: 1.08, contrast: 0.8, saturate: 0.72, temperature: 0.06, tint: 0.02, wash: 0.22, vignette: 0.1 } },
  { id: "universal-cine", name: "Universal cine", hint: "Todo terreno", group: "Especial", swatch: "linear-gradient(145deg,#94a3b8,#f59e0b)", patch: { filter: "cinema", brightness: 1, contrast: 1.14, saturate: 0.95, temperature: 0.1, tint: -0.04, wash: 0.04, vignette: 0.18 } },
  { id: "cinestill800", name: "Cinestill 800T", hint: "Halos rojos", group: "Kodak", swatch: "linear-gradient(145deg,#fbbf24,#ef4444)", patch: { filter: "amber", brightness: 0.98, contrast: 1.12, saturate: 1.05, temperature: 0.46, tint: 0.14, wash: 0.04, vignette: 0.28 } },
  { id: "cinestill50", name: "Cinestill 50D", hint: "Día fino", group: "Kodak", swatch: "linear-gradient(145deg,#93c5fd,#fde68a)", patch: { filter: "cinema", brightness: 1.04, contrast: 1.06, saturate: 0.98, temperature: 0.12, tint: -0.02, wash: 0.04, vignette: 0.12 } },
  { id: "ilford-hp5", name: "Ilford HP5", hint: "B y N grano", group: "Kodak", swatch: "linear-gradient(160deg,#a3a3a3,#171717)", patch: { filter: "mono", brightness: 1, contrast: 1.18, saturate: 0, temperature: 0, tint: 0, wash: 0.06, vignette: 0.22 } },
  { id: "ilford-delta", name: "Ilford Delta", hint: "B y N fino", group: "Kodak", swatch: "linear-gradient(160deg,#d4d4d4,#404040)", patch: { filter: "mono", brightness: 1.02, contrast: 1.08, saturate: 0, temperature: 0, tint: 0, wash: 0.04, vignette: 0.16 } },
  { id: "tri-x", name: "Tri-X 400", hint: "Clásico B y N", group: "Kodak", swatch: "linear-gradient(160deg,#e5e5e5,#262626)", patch: { filter: "noir", brightness: 0.98, contrast: 1.28, saturate: 0, temperature: 0, tint: 0, wash: 0.02, vignette: 0.26 } },
  { id: "t-max", name: "T-Max 100", hint: "B y N nítido", group: "Kodak", swatch: "linear-gradient(160deg,#f5f5f5,#525252)", patch: { filter: "mono", brightness: 1.04, contrast: 1.14, saturate: 0, temperature: 0, tint: 0, wash: 0, vignette: 0.12 } },
  { id: "lomo-400", name: "Lomo 400", hint: "Cruzado", group: "Fuji", swatch: "linear-gradient(135deg,#22d3ee,#f472b6)", patch: { filter: "vivid", brightness: 1.04, contrast: 1.16, saturate: 1.35, temperature: -0.08, tint: 0.32, wash: 0, vignette: 0.2 } },
  { id: "lomo-800", name: "Lomo 800", hint: "Noche cruzada", group: "Fuji", swatch: "linear-gradient(135deg,#06b6d4,#ec4899)", patch: { filter: "neon", brightness: 0.96, contrast: 1.2, saturate: 1.3, temperature: -0.06, tint: 0.28, wash: 0.04, vignette: 0.28 } },
  { id: "astía", name: "Astia 100F", hint: "Piel suave", group: "Fuji", swatch: "linear-gradient(145deg,#fca5a5,#fde68a)", patch: { filter: "rose", brightness: 1.06, contrast: 0.96, saturate: 0.9, temperature: 0.18, tint: 0.1, wash: 0.08, vignette: 0.1 } },
  { id: "acros", name: "Acros 100", hint: "B y N Fuji", group: "Fuji", swatch: "linear-gradient(160deg,#e5e5e5,#404040)", patch: { filter: "mono", brightness: 1.02, contrast: 1.1, saturate: 0, temperature: 0, tint: 0, wash: 0.02, vignette: 0.14 } },
  { id: "neopan", name: "Neopan 400", hint: "B y N contraste", group: "Fuji", swatch: "linear-gradient(160deg,#d4d4d4,#171717)", patch: { filter: "noir", brightness: 0.96, contrast: 1.32, saturate: 0, temperature: 0, tint: 0, wash: 0, vignette: 0.24 } },
  { id: "orange-teal-soft", name: "OT soft", hint: "Suave", group: "Cine", swatch: "linear-gradient(135deg,#67e8f9,#fdba74)", patch: { filter: "teal", brightness: 1.04, contrast: 1.04, saturate: 0.92, temperature: 0.14, tint: -0.08, wash: 0.06, vignette: 0.12 } },
  { id: "orange-teal-hard", name: "OT hard", hint: "Fuerte", group: "Cine", swatch: "linear-gradient(135deg,#0e7490,#c2410c)", patch: { filter: "teal", brightness: 0.92, contrast: 1.38, saturate: 1.22, temperature: 0.38, tint: -0.22, wash: 0, vignette: 0.36 } },
  { id: "blue-orange", name: "Azul y naranja", hint: "Contraste", group: "Cine", swatch: "linear-gradient(135deg,#1d4ed8,#f97316)", patch: { filter: "teal", brightness: 0.98, contrast: 1.2, saturate: 1.1, temperature: 0.26, tint: -0.14, wash: 0, vignette: 0.24 } },
  { id: "green-magenta", name: "Verde y magenta", hint: "Complementario", group: "Cine", swatch: "linear-gradient(135deg,#22c55e,#ec4899)", patch: { filter: "vivid", brightness: 1, contrast: 1.16, saturate: 1.25, temperature: 0.04, tint: 0.22, wash: 0, vignette: 0.18 } },
  { id: "yellow-blue", name: "Amarillo y azul", hint: "Split", group: "Cine", swatch: "linear-gradient(135deg,#fbbf24,#1e40af)", patch: { filter: "cool", brightness: 1.02, contrast: 1.14, saturate: 1.08, temperature: 0.2, tint: -0.1, wash: 0, vignette: 0.2 } },
  { id: "crimson-night", name: "Carmesí noche", hint: "Rojo oscuro", group: "Cine", swatch: "linear-gradient(160deg,#7f1d1d,#0f172a)", patch: { filter: "drama", brightness: 0.86, contrast: 1.3, saturate: 0.95, temperature: 0.32, tint: 0.16, wash: 0, vignette: 0.42 } },
  { id: "steel-blue", name: "Steel blue", hint: "Acero", group: "Cine", swatch: "linear-gradient(160deg,#475569,#1e3a8a)", patch: { filter: "cool", brightness: 0.94, contrast: 1.18, saturate: 0.72, temperature: -0.16, tint: 0.04, wash: 0.08, vignette: 0.28 } },
  { id: "copper", name: "Cobre", hint: "Metal cálido", group: "Cine", swatch: "linear-gradient(145deg,#b45309,#fbbf24)", patch: { filter: "amber", brightness: 0.98, contrast: 1.12, saturate: 0.95, temperature: 0.4, tint: 0.06, wash: 0.04, vignette: 0.26 } },
  { id: "bronze", name: "Bronce", hint: "Épico", group: "Cine", swatch: "linear-gradient(145deg,#92400e,#d6d3d1)", patch: { filter: "amber", brightness: 1, contrast: 1.08, saturate: 0.8, temperature: 0.34, tint: 0.04, wash: 0.1, vignette: 0.24 } },
  { id: "champagne", name: "Champagne", hint: "Lujo", group: "Cálido", swatch: "linear-gradient(145deg,#fde68a,#fef3c7)", patch: { filter: "warm", brightness: 1.08, contrast: 0.96, saturate: 0.88, temperature: 0.22, tint: 0.06, wash: 0.1, vignette: 0.1 } },
  { id: "honey", name: "Miel", hint: "Dulce", group: "Cálido", swatch: "linear-gradient(145deg,#f59e0b,#fef3c7)", patch: { filter: "amber", brightness: 1.06, contrast: 1.02, saturate: 1.05, temperature: 0.38, tint: 0.04, wash: 0.08, vignette: 0.12 } },
  { id: "caramel", name: "Caramelo", hint: "Marrón", group: "Cálido", swatch: "linear-gradient(145deg,#c2410c,#fde68a)", patch: { filter: "amber", brightness: 1.02, contrast: 1.06, saturate: 0.92, temperature: 0.42, tint: 0.06, wash: 0.06, vignette: 0.18 } },
  { id: "sand-warm", name: "Arena cálida", hint: "Desierto", group: "Cálido", swatch: "linear-gradient(145deg,#d6d3d1,#fbbf24)", patch: { filter: "warm", brightness: 1.04, contrast: 1.04, saturate: 0.85, temperature: 0.3, tint: 0.02, wash: 0.1, vignette: 0.16 } },
  { id: "peach", name: "Durazno", hint: "Suave", group: "Cálido", swatch: "linear-gradient(145deg,#fdba74,#fecdd3)", patch: { filter: "rose", brightness: 1.08, contrast: 0.94, saturate: 0.95, temperature: 0.26, tint: 0.1, wash: 0.08, vignette: 0.08 } },
  { id: "coral", name: "Coral", hint: "Vivo", group: "Cálido", swatch: "linear-gradient(145deg,#fb7185,#fbbf24)", patch: { filter: "vivid", brightness: 1.04, contrast: 1.1, saturate: 1.2, temperature: 0.28, tint: 0.12, wash: 0, vignette: 0.1 } },
  { id: "terracotta", name: "Terracota", hint: "Tierra", group: "Cálido", swatch: "linear-gradient(145deg,#c2410c,#a8a29e)", patch: { filter: "amber", brightness: 0.98, contrast: 1.08, saturate: 0.88, temperature: 0.36, tint: 0.06, wash: 0.08, vignette: 0.2 } },
  { id: "autumn", name: "Otoño", hint: "Hojas", group: "Cálido", swatch: "linear-gradient(145deg,#ea580c,#fbbf24)", patch: { filter: "sunset", brightness: 1.02, contrast: 1.1, saturate: 1.15, temperature: 0.4, tint: 0.04, wash: 0.04, vignette: 0.16 } },
  { id: "candle", name: "Vela", hint: "Interior", group: "Cálido", swatch: "linear-gradient(145deg,#b45309,#fef3c7)", patch: { filter: "amber", brightness: 0.96, contrast: 1.04, saturate: 0.85, temperature: 0.5, tint: 0.04, wash: 0.08, vignette: 0.3 } },
  { id: "fireplace", name: "Chimenea", hint: "Noche", group: "Cálido", swatch: "linear-gradient(145deg,#7c2d12,#fbbf24)", patch: { filter: "amber", brightness: 0.92, contrast: 1.12, saturate: 0.9, temperature: 0.48, tint: 0.06, wash: 0.04, vignette: 0.36 } },
  { id: "fog", name: "Niebla", hint: "Gris", group: "Moody", swatch: "linear-gradient(160deg,#cbd5e1,#64748b)", patch: { filter: "cool", brightness: 1.04, contrast: 0.9, saturate: 0.55, temperature: -0.08, tint: 0.02, wash: 0.18, vignette: 0.16 } },
  { id: "rain", name: "Lluvia", hint: "Frío", group: "Moody", swatch: "linear-gradient(160deg,#475569,#1e293b)", patch: { filter: "cool", brightness: 0.94, contrast: 1.1, saturate: 0.6, temperature: -0.16, tint: 0.04, wash: 0.1, vignette: 0.28 } },
  { id: "overcast", name: "Nublado", hint: "Plano", group: "Moody", swatch: "linear-gradient(160deg,#94a3b8,#475569)", patch: { filter: "cool", brightness: 1.02, contrast: 0.96, saturate: 0.65, temperature: -0.1, tint: 0.02, wash: 0.12, vignette: 0.12 } },
  { id: "storm", name: "Tormenta", hint: "Oscuro", group: "Moody", swatch: "linear-gradient(160deg,#1e293b,#020617)", patch: { filter: "night", brightness: 0.8, contrast: 1.32, saturate: 0.55, temperature: -0.12, tint: 0.02, wash: 0.04, vignette: 0.44 } },
  { id: "dusk-moody", name: "Anochecer", hint: "Azul", group: "Moody", swatch: "linear-gradient(160deg,#1e3a8a,#0f172a)", patch: { filter: "night", brightness: 0.9, contrast: 1.16, saturate: 0.75, temperature: -0.2, tint: 0.06, wash: 0.06, vignette: 0.32 } },
  { id: "twilight", name: "Crepúsculo", hint: "Púrpura", group: "Moody", swatch: "linear-gradient(160deg,#6d28d9,#1e1b4b)", patch: { filter: "neon", brightness: 0.92, contrast: 1.14, saturate: 0.85, temperature: -0.08, tint: 0.18, wash: 0.04, vignette: 0.3 } },
  { id: "midnight", name: "Medianoche", hint: "Negro", group: "Moody", swatch: "linear-gradient(160deg,#0f172a,#020617)", patch: { filter: "night", brightness: 0.76, contrast: 1.36, saturate: 0.6, temperature: -0.14, tint: 0.04, wash: 0, vignette: 0.5 } },
  { id: "noir-color", name: "Noir color", hint: "Oscuro", group: "Moody", swatch: "linear-gradient(160deg,#1f2937,#111827)", patch: { filter: "drama", brightness: 0.88, contrast: 1.28, saturate: 0.5, temperature: -0.04, tint: 0.02, wash: 0.06, vignette: 0.4 } },
  { id: "shadow", name: "Sombra", hint: "Bajo", group: "Moody", swatch: "linear-gradient(160deg,#374151,#030712)", patch: { filter: "drama", brightness: 0.84, contrast: 1.3, saturate: 0.58, temperature: -0.06, tint: 0, wash: 0.02, vignette: 0.46 } },
  { id: "haze", name: "Haze", hint: "Lavado", group: "Moody", swatch: "linear-gradient(160deg,#e7e5e4,#78716c)", patch: { filter: "matte", brightness: 1.06, contrast: 0.86, saturate: 0.65, temperature: 0.06, tint: 0.02, wash: 0.2, vignette: 0.14 } },
  { id: "polaroid", name: "Polaroid", hint: "Instantánea", group: "Vintage", swatch: "linear-gradient(145deg,#fde68a,#d6d3d1)", patch: { filter: "vintage", brightness: 1.06, contrast: 0.98, saturate: 0.9, temperature: 0.2, tint: 0.06, wash: 0.1, vignette: 0.18 } },
  { id: "instax", name: "Instax", hint: "Blanca", group: "Vintage", swatch: "linear-gradient(145deg,#fef3c7,#e7e5e4)", patch: { filter: "warm", brightness: 1.1, contrast: 0.94, saturate: 0.88, temperature: 0.16, tint: 0.04, wash: 0.12, vignette: 0.12 } },
  { id: "disposable", name: "Desechable", hint: "Flash", group: "Vintage", swatch: "linear-gradient(145deg,#fef3c7,#fca5a5)", patch: { filter: "warm", brightness: 1.08, contrast: 1.02, saturate: 0.95, temperature: 0.24, tint: 0.08, wash: 0.06, vignette: 0.16 } },
  { id: "slide-film", name: "Diapositiva", hint: "Viva", group: "Vintage", swatch: "linear-gradient(145deg,#ef4444,#22c55e)", patch: { filter: "vivid", brightness: 1.02, contrast: 1.16, saturate: 1.3, temperature: 0.08, tint: 0.04, wash: 0, vignette: 0.14 } },
  { id: "print-film", name: "Print film", hint: "Copia", group: "Vintage", swatch: "linear-gradient(145deg,#fcd34d,#a8a29e)", patch: { filter: "vintage", brightness: 1.04, contrast: 1.04, saturate: 0.88, temperature: 0.18, tint: 0.04, wash: 0.08, vignette: 0.2 } },
  { id: "cross-process", name: "Cross process", hint: "Química", group: "Vintage", swatch: "linear-gradient(135deg,#22d3ee,#f472b6)", patch: { filter: "vivid", brightness: 1.02, contrast: 1.18, saturate: 1.32, temperature: -0.06, tint: 0.3, wash: 0, vignette: 0.18 } },
  { id: "bleach-skip", name: "Bleach skip", hint: "Contraste", group: "Vintage", swatch: "linear-gradient(160deg,#d6d3d1,#404040)", patch: { filter: "bleach", brightness: 1, contrast: 1.24, saturate: 0.6, temperature: 0.04, tint: -0.02, wash: 0.1, vignette: 0.2 } },
  { id: "pushed", name: "Pushed", hint: "Forzada", group: "Vintage", swatch: "linear-gradient(145deg,#fbbf24,#78716c)", patch: { filter: "grain", brightness: 0.98, contrast: 1.16, saturate: 0.85, temperature: 0.14, tint: 0.02, wash: 0.06, vignette: 0.22 } },
  { id: "pulled", name: "Pulled", hint: "Suave", group: "Vintage", swatch: "linear-gradient(145deg,#e7e5e4,#a8a29e)", patch: { filter: "matte", brightness: 1.06, contrast: 0.9, saturate: 0.75, temperature: 0.08, tint: 0.02, wash: 0.12, vignette: 0.14 } },
  { id: "redscale", name: "Redscale", hint: "Rojo", group: "Vintage", swatch: "linear-gradient(145deg,#dc2626,#fbbf24)", patch: { filter: "sunset", brightness: 1.02, contrast: 1.12, saturate: 1.15, temperature: 0.46, tint: 0.14, wash: 0.04, vignette: 0.2 } },
  { id: "air-light", name: "Aire claro", hint: "Alto", group: "Limpio", swatch: "linear-gradient(145deg,#fff,#e0f2fe)", patch: { filter: "ice", brightness: 1.16, contrast: 0.9, saturate: 0.8, temperature: -0.06, tint: 0.04, wash: 0.14, vignette: 0.02 } },
  { id: "studio-white", name: "Estudio blanco", hint: "Producto", group: "Limpio", swatch: "linear-gradient(145deg,#fff,#f8fafc)", patch: { filter: "none", brightness: 1.14, contrast: 1.02, saturate: 0.95, temperature: 0, tint: 0, wash: 0.04, vignette: 0 } },
  { id: "catalog", name: "Catálogo", hint: "Neutro", group: "Limpio", swatch: "linear-gradient(145deg,#f8fafc,#e2e8f0)", patch: { filter: "none", brightness: 1.08, contrast: 1.04, saturate: 0.98, temperature: 0.02, tint: 0, wash: 0.02, vignette: 0.02 } },
  { id: "beauty", name: "Beauty", hint: "Piel", group: "Limpio", swatch: "linear-gradient(145deg,#fecdd3,#fef3c7)", patch: { filter: "rose", brightness: 1.08, contrast: 0.94, saturate: 0.88, temperature: 0.16, tint: 0.08, wash: 0.1, vignette: 0.08 } },
  { id: "fashion", name: "Fashion", hint: "Editorial", group: "Limpio", swatch: "linear-gradient(145deg,#f8fafc,#cbd5e1)", patch: { filter: "cinema", brightness: 1.04, contrast: 1.1, saturate: 0.92, temperature: 0.04, tint: 0.02, wash: 0.04, vignette: 0.12 } },
  { id: "commercial-pop", name: "Comercial pop", hint: "Vivo", group: "Limpio", swatch: "linear-gradient(145deg,#fff,#fde68a)", patch: { filter: "vivid", brightness: 1.1, contrast: 1.08, saturate: 1.15, temperature: 0.1, tint: 0.02, wash: 0, vignette: 0.04 } },
  { id: "youtube-crisp", name: "YouTube", hint: "Crisp", group: "Limpio", swatch: "linear-gradient(145deg,#fff,#e2e8f0)", patch: { filter: "none", brightness: 1.06, contrast: 1.1, saturate: 1.08, temperature: 0.04, tint: 0.02, wash: 0, vignette: 0.04 } },
  { id: "tiktok-bright", name: "TikTok", hint: "Brillante", group: "Limpio", swatch: "linear-gradient(145deg,#fff,#fef3c7)", patch: { filter: "vivid", brightness: 1.1, contrast: 1.06, saturate: 1.12, temperature: 0.08, tint: 0.04, wash: 0.02, vignette: 0.02 } },
  { id: "reels-pop", name: "Reels pop", hint: "Scroll", group: "Limpio", swatch: "linear-gradient(135deg,#f43f5e,#fbbf24)", patch: { filter: "vivid", brightness: 1.04, contrast: 1.2, saturate: 1.3, temperature: 0.12, tint: 0.08, wash: 0, vignette: 0.08 } },
  { id: "instagram-warm", name: "Instagram", hint: "Cálido", group: "Limpio", swatch: "linear-gradient(145deg,#fdba74,#fef3c7)", patch: { filter: "warm", brightness: 1.06, contrast: 1.02, saturate: 1.05, temperature: 0.28, tint: 0.04, wash: 0.06, vignette: 0.08 } },
  { id: "club-neon", name: "Club neón", hint: "Fiesta", group: "Urbano", swatch: "linear-gradient(150deg,#6d28d9,#00d4c8)", patch: { filter: "neon", brightness: 0.88, contrast: 1.24, saturate: 1.42, temperature: -0.12, tint: 0.24, wash: 0, vignette: 0.38 } },
  { id: "laser", name: "Láser", hint: "Club", group: "Urbano", swatch: "linear-gradient(135deg,#22d3ee,#a855f7)", patch: { filter: "neon", brightness: 0.9, contrast: 1.26, saturate: 1.38, temperature: -0.1, tint: 0.2, wash: 0, vignette: 0.32 } },
  { id: "street-night", name: "Calle noche", hint: "Urbano", group: "Urbano", swatch: "linear-gradient(160deg,#1f2937,#fbbf24)", patch: { filter: "night", brightness: 0.88, contrast: 1.2, saturate: 0.85, temperature: 0.16, tint: -0.04, wash: 0, vignette: 0.36 } },
  { id: "subway", name: "Metro", hint: "Frío", group: "Urbano", swatch: "linear-gradient(160deg,#475569,#1e293b)", patch: { filter: "cool", brightness: 0.94, contrast: 1.12, saturate: 0.6, temperature: -0.14, tint: 0.02, wash: 0.08, vignette: 0.24 } },
  { id: "graffiti", name: "Graffiti", hint: "Color", group: "Urbano", swatch: "linear-gradient(135deg,#ef4444,#22c55e)", patch: { filter: "vivid", brightness: 1, contrast: 1.18, saturate: 1.35, temperature: 0.06, tint: 0.1, wash: 0, vignette: 0.16 } },
  { id: "warehouse", name: "Almacén", hint: "Industrial", group: "Urbano", swatch: "linear-gradient(160deg,#78716c,#1c1917)", patch: { filter: "cinema", brightness: 0.92, contrast: 1.16, saturate: 0.65, temperature: 0.04, tint: 0.02, wash: 0.08, vignette: 0.3 } },
  { id: "rooftop", name: "Azotea", hint: "Ciudad", group: "Urbano", swatch: "linear-gradient(160deg,#1e3a8a,#f59e0b)", patch: { filter: "sunset", brightness: 0.96, contrast: 1.14, saturate: 1.05, temperature: 0.22, tint: -0.06, wash: 0.02, vignette: 0.28 } },
  { id: "rain-city", name: "Ciudad lluvia", hint: "Neón mojado", group: "Urbano", swatch: "linear-gradient(160deg,#0e7490,#1e1b4b)", patch: { filter: "neon", brightness: 0.9, contrast: 1.2, saturate: 1.1, temperature: -0.12, tint: 0.12, wash: 0.04, vignette: 0.34 } },
  { id: "traffic", name: "Tráfico", hint: "Luces", group: "Urbano", swatch: "linear-gradient(135deg,#ef4444,#fbbf24)", patch: { filter: "vivid", brightness: 0.96, contrast: 1.22, saturate: 1.2, temperature: 0.18, tint: 0.08, wash: 0, vignette: 0.26 } },
  { id: "concert", name: "Concierto", hint: "Escenario", group: "Urbano", swatch: "linear-gradient(135deg,#7c3aed,#f43f5e)", patch: { filter: "neon", brightness: 0.88, contrast: 1.26, saturate: 1.4, temperature: -0.04, tint: 0.26, wash: 0, vignette: 0.36 } },
  { id: "music-video", name: "Videoclip", hint: "Trap", group: "Especial", swatch: "linear-gradient(135deg,#6d28d9,#f97316)", patch: { filter: "neon", brightness: 0.92, contrast: 1.24, saturate: 1.28, temperature: 0.08, tint: 0.16, wash: 0, vignette: 0.3 } },
  { id: "reggaeton", name: "Reggaeton", hint: "Noche", group: "Especial", swatch: "linear-gradient(135deg,#ec4899,#fbbf24)", patch: { filter: "vivid", brightness: 0.96, contrast: 1.2, saturate: 1.32, temperature: 0.2, tint: 0.18, wash: 0, vignette: 0.24 } },
  { id: "latin-night", name: "Noche latina", hint: "Club", group: "Especial", swatch: "linear-gradient(150deg,#7c3aed,#00d4c8)", patch: { filter: "neon", brightness: 0.9, contrast: 1.22, saturate: 1.35, temperature: -0.08, tint: 0.2, wash: 0, vignette: 0.32 } },
  { id: "studio-rec", name: "Estudio rec", hint: "Micrófono", group: "Especial", swatch: "linear-gradient(160deg,#1e1b4b,#00d4c8)", patch: { filter: "neon", brightness: 0.94, contrast: 1.16, saturate: 1.1, temperature: -0.1, tint: 0.12, wash: 0.04, vignette: 0.28 } },
  { id: "vinyl", name: "Vinilo", hint: "Cálido", group: "Especial", swatch: "linear-gradient(145deg,#b45309,#fde68a)", patch: { filter: "amber", brightness: 1.02, contrast: 1.06, saturate: 0.9, temperature: 0.32, tint: 0.04, wash: 0.06, vignette: 0.22 } },
  { id: "bass", name: "Bass", hint: "Bajo", group: "Especial", swatch: "linear-gradient(160deg,#1e1b4b,#7c3aed)", patch: { filter: "neon", brightness: 0.86, contrast: 1.28, saturate: 1.2, temperature: -0.06, tint: 0.18, wash: 0, vignette: 0.4 } },
  { id: "drop", name: "Drop", hint: "Impacto", group: "Especial", swatch: "linear-gradient(135deg,#f43f5e,#8b5cf6)", patch: { filter: "punch", brightness: 1, contrast: 1.34, saturate: 1.38, temperature: 0.06, tint: 0.14, wash: 0, vignette: 0.18 } },
  { id: "hook", name: "Hook", hint: "Eslogan", group: "Especial", swatch: "linear-gradient(135deg,#fbbf24,#f43f5e)", patch: { filter: "vivid", brightness: 1.04, contrast: 1.24, saturate: 1.32, temperature: 0.16, tint: 0.1, wash: 0, vignette: 0.12 } },
  { id: "chorus", name: "Coro", hint: "Brillo", group: "Especial", swatch: "linear-gradient(145deg,#fde68a,#fff)", patch: { filter: "warm", brightness: 1.1, contrast: 1.04, saturate: 1.08, temperature: 0.24, tint: 0.04, wash: 0.08, vignette: 0.08 } },
  { id: "verse", name: "Verso", hint: "Íntimo", group: "Especial", swatch: "linear-gradient(160deg,#1e293b,#475569)", patch: { filter: "cinema", brightness: 0.94, contrast: 1.1, saturate: 0.75, temperature: 0.04, tint: 0.02, wash: 0.08, vignette: 0.26 } },
  { id: "bridge", name: "Puente", hint: "Transición", group: "Especial", swatch: "linear-gradient(135deg,#06b6d4,#f59e0b)", patch: { filter: "teal", brightness: 1, contrast: 1.14, saturate: 1.05, temperature: 0.18, tint: -0.08, wash: 0.02, vignette: 0.2 } },
  { id: "outro", name: "Outro", hint: "Cierre", group: "Especial", swatch: "linear-gradient(160deg,#0f172a,#1e293b)", patch: { filter: "night", brightness: 0.88, contrast: 1.16, saturate: 0.7, temperature: -0.06, tint: 0.04, wash: 0.06, vignette: 0.36 } },
  { id: "intro", name: "Intro", hint: "Apertura", group: "Especial", swatch: "linear-gradient(160deg,#020617,#1e3a8a)", patch: { filter: "night", brightness: 0.9, contrast: 1.18, saturate: 0.8, temperature: -0.1, tint: 0.04, wash: 0.04, vignette: 0.32 } },
  { id: "logo", name: "Logo", hint: "Marca", group: "Especial", swatch: "linear-gradient(145deg,#00d4c8,#0c0c0e)", patch: { filter: "none", brightness: 1, contrast: 1.12, saturate: 1.05, temperature: -0.04, tint: 0.06, wash: 0, vignette: 0.16 } },
  { id: "end-card", name: "End card", hint: "Cierre", group: "Especial", swatch: "linear-gradient(160deg,#0c0c0e,#141416)", patch: { filter: "none", brightness: 0.96, contrast: 1.08, saturate: 0.9, temperature: 0, tint: 0, wash: 0.04, vignette: 0.2 } },
  { id: "subscribe", name: "Subscribe", hint: "CTA", group: "Especial", swatch: "linear-gradient(135deg,#ef4444,#fff)", patch: { filter: "vivid", brightness: 1.06, contrast: 1.16, saturate: 1.2, temperature: 0.08, tint: 0.06, wash: 0, vignette: 0.06 } },
  { id: "like", name: "Like", hint: "Pulgar", group: "Especial", swatch: "linear-gradient(145deg,#3b82f6,#fff)", patch: { filter: "cool", brightness: 1.04, contrast: 1.08, saturate: 1.05, temperature: -0.04, tint: 0.04, wash: 0.02, vignette: 0.04 } },
  { id: "share", name: "Share", hint: "Compartir", group: "Especial", swatch: "linear-gradient(145deg,#22c55e,#fff)", patch: { filter: "vivid", brightness: 1.04, contrast: 1.1, saturate: 1.12, temperature: 0.04, tint: 0.02, wash: 0, vignette: 0.04 } },
  { id: "comment", name: "Comment", hint: "Texto", group: "Especial", swatch: "linear-gradient(145deg,#fbbf24,#fff)", patch: { filter: "warm", brightness: 1.06, contrast: 1.06, saturate: 1.08, temperature: 0.12, tint: 0.04, wash: 0.02, vignette: 0.04 } },
  { id: "follow", name: "Follow", hint: "Seguir", group: "Especial", swatch: "linear-gradient(145deg,#ec4899,#fff)", patch: { filter: "rose", brightness: 1.06, contrast: 1.08, saturate: 1.15, temperature: 0.1, tint: 0.1, wash: 0.02, vignette: 0.04 } },
  { id: "live", name: "Live", hint: "En vivo", group: "Especial", swatch: "linear-gradient(145deg,#ef4444,#1f2937)", patch: { filter: "drama", brightness: 0.96, contrast: 1.24, saturate: 1.15, temperature: 0.12, tint: 0.08, wash: 0, vignette: 0.22 } },
  { id: "premiere", name: "Estreno", hint: "Nuevo", group: "Especial", swatch: "linear-gradient(135deg,#fbbf24,#7c3aed)", patch: { filter: "vivid", brightness: 1.02, contrast: 1.2, saturate: 1.25, temperature: 0.14, tint: 0.12, wash: 0, vignette: 0.16 } },
  { id: "gold-rush", name: "Gold rush", hint: "Oro vivo", group: "Cálido", swatch: "linear-gradient(145deg,#f59e0b,#fffbeb)", patch: { filter: "amber", brightness: 1.08, contrast: 1.06, saturate: 1.12, temperature: 0.4, tint: 0.04, wash: 0.06, vignette: 0.1 } },
  { id: "silver-screen", name: "Silver screen", hint: "Clásico", group: "Especial", swatch: "linear-gradient(160deg,#e5e5e5,#525252)", patch: { filter: "mono", brightness: 1.02, contrast: 1.16, saturate: 0, temperature: 0, tint: 0, wash: 0.04, vignette: 0.22 } },
  { id: "technicolor", name: "Technicolor", hint: "Vivo antiguo", group: "Vintage", swatch: "linear-gradient(145deg,#ef4444,#22c55e)", patch: { filter: "vivid", brightness: 1.02, contrast: 1.2, saturate: 1.4, temperature: 0.1, tint: 0.06, wash: 0, vignette: 0.14 } },
  { id: "day-for-night", name: "Día por noche", hint: "Azul", group: "Cine", swatch: "linear-gradient(180deg,#020617,#1d4ed8)", patch: { filter: "night", brightness: 0.74, contrast: 1.22, saturate: 0.72, temperature: -0.26, tint: 0.08, wash: 0, vignette: 0.38 } },
  { id: "sodium-vapor", name: "Sodio", hint: "Naranja noche", group: "Urbano", swatch: "linear-gradient(160deg,#7c2d12,#fbbf24)", patch: { filter: "amber", brightness: 0.9, contrast: 1.18, saturate: 0.95, temperature: 0.46, tint: 0.04, wash: 0.04, vignette: 0.34 } },
  { id: "moonlight", name: "Luz de luna", hint: "Azul suave", group: "Moody", swatch: "linear-gradient(160deg,#1e3a8a,#93c5fd)", patch: { filter: "ice", brightness: 0.96, contrast: 1.1, saturate: 0.85, temperature: -0.3, tint: 0.1, wash: 0.08, vignette: 0.26 } },
  { id: "sunrise", name: "Amanecer", hint: "Rosa y oro", group: "Cálido", swatch: "linear-gradient(145deg,#fb7185,#fde68a)", patch: { filter: "sunset", brightness: 1.06, contrast: 1.04, saturate: 1.1, temperature: 0.34, tint: 0.1, wash: 0.06, vignette: 0.12 } },
  { id: "andromeda", name: "Andromeda", hint: "Marca", group: "Especial", swatch: "linear-gradient(145deg,#00d4c8,#0c0c0e)", patch: { filter: "neon", brightness: 0.98, contrast: 1.14, saturate: 1.15, temperature: -0.08, tint: 0.1, wash: 0, vignette: 0.2 } },
];

export const TEXT_COLORS = [
  "#f7f7f8",
  "#ffe14a",
  "#00d4c8",
  "#c084fc",
  "#ff5d78",
  "#ff3b30",
  "#ff8a00",
  "#b6ff4d",
  "#4da3ff",
  "#f472b6",
  "#f3e6d0",
  "#0c0c0e",
  "#fff1c9",
  "#ffd6a0",
  "#e8ff6a",
  "#7cffb2",
  "#5eead4",
  "#38bdf8",
  "#1d4ed8",
  "#7c3aed",
  "#ff2bd6",
  "#9f1239",
  "#fb7185",
  "#d6d3d1",
];

export const TEXT_FONTS: { id: string; label: string; family: string; weight: number; bold: number }[] = [
  { id: "jakarta", label: "Jakarta", family: '"Plus Jakarta Sans", sans-serif', weight: 600, bold: 800 },
  { id: "bebas", label: "Bebas", family: '"Bebas Neue", sans-serif', weight: 400, bold: 400 },
  { id: "anton", label: "Anton", family: '"Anton", sans-serif', weight: 400, bold: 400 },
  { id: "oswald", label: "Oswald", family: '"Oswald", sans-serif', weight: 500, bold: 700 },
  { id: "archivo", label: "Archivo Black", family: '"Archivo Black", sans-serif', weight: 400, bold: 400 },
  { id: "montserrat", label: "Montserrat", family: '"Montserrat", sans-serif', weight: 600, bold: 800 },
  { id: "barlow", label: "Barlow", family: '"Barlow Condensed", sans-serif', weight: 600, bold: 700 },
  { id: "teko", label: "Teko", family: '"Teko", sans-serif', weight: 600, bold: 700 },
  { id: "russo", label: "Russo", family: '"Russo One", sans-serif', weight: 400, bold: 400 },
  { id: "bangers", label: "Bangers", family: '"Bangers", cursive', weight: 400, bold: 400 },
  { id: "stencil", label: "Stencil", family: '"Black Ops One", sans-serif', weight: 400, bold: 400 },
  { id: "lilita", label: "Lilita", family: '"Lilita One", sans-serif', weight: 400, bold: 400 },
  { id: "marker", label: "Marker", family: '"Permanent Marker", cursive', weight: 400, bold: 400 },
  { id: "pacifico", label: "Pacifico", family: '"Pacifico", cursive', weight: 400, bold: 400 },
  { id: "playfair", label: "Playfair", family: '"Playfair Display", serif', weight: 700, bold: 900 },
  { id: "bungee", label: "3D", family: '"Bungee", sans-serif', weight: 400, bold: 400 },
  { id: "rubik", label: "Bloque", family: '"Rubik Mono One", sans-serif', weight: 400, bold: 400 },
  { id: "orbitron", label: "Futura", family: '"Orbitron", sans-serif', weight: 700, bold: 800 },
  { id: "pixel", label: "Pixel", family: '"Press Start 2P", cursive', weight: 400, bold: 400 },
  { id: "monoton", label: "Neón retro", family: '"Monoton", cursive', weight: 400, bold: 400 },
];

export function fontFace(family: string) {
  return family.match(/"([^"]+)"/)?.[1] ?? "sans-serif";
}

export interface TextLook {
  id: string;
  name: string;
  font: string;
  color: string;
  plate: boolean;
  stroke: string;
  strokeWidth: number;
  shadow: 0 | 1 | 2 | 3;
  shadowColor?: string;
  tracking: number;
}

export const TEXT_LOOKS: TextLook[] = [
  { id: "limpio", name: "Limpio", font: "jakarta", color: "#f7f7f8", plate: false, stroke: "#0c0c0e", strokeWidth: 0.1, shadow: 0, tracking: 0 },
  { id: "placa", name: "Placa", font: "montserrat", color: "#f7f7f8", plate: true, stroke: "none", strokeWidth: 0, shadow: 0, tracking: 0 },
  { id: "oro", name: "Oro", font: "bebas", color: "#ffe14a", plate: false, stroke: "#1a1404", strokeWidth: 0.16, shadow: 1, tracking: 0.045 },
  { id: "neon", name: "Neón", font: "russo", color: "#00d4c8", plate: false, stroke: "none", strokeWidth: 0, shadow: 2, shadowColor: "#00d4c8", tracking: 0.02 },
  { id: "hueco", name: "Hueco", font: "anton", color: "transparent", plate: false, stroke: "#f7f7f8", strokeWidth: 0.075, shadow: 0, tracking: 0.03 },
  { id: "poster", name: "Poster", font: "archivo", color: "#f7f7f8", plate: false, stroke: "none", strokeWidth: 0, shadow: 3, tracking: -0.03 },
  { id: "violeta", name: "Violeta", font: "lilita", color: "#c084fc", plate: false, stroke: "#0c0c0e", strokeWidth: 0.13, shadow: 1, tracking: 0 },
];

export function lookFields(look: TextLook): Partial<Clip> {
  return {
    font: look.font,
    color: look.color,
    plate: look.plate,
    stroke: look.stroke,
    strokeWidth: look.strokeWidth,
    shadow: look.shadow,
    shadowColor: look.shadowColor,
    tracking: look.tracking,
    bold: true,
  };
}

export function sameLook(clip: Clip, look: TextLook) {
  return (
    (clip.font ?? "jakarta") === look.font &&
    (clip.color ?? "#f7f7f8") === look.color &&
    Boolean(clip.plate) === look.plate &&
    (clip.shadow ?? 0) === look.shadow &&
    (clip.stroke ?? "auto") === look.stroke
  );
}

export type TextDraft = {
  name: string;
  text: string;
  fontSize: number;
  anim: TextAnim;
  duration: number;
  bold?: boolean;
  plate?: boolean;
  align?: Clip["align"];
  y?: number;
  font?: string;
  color?: string;
  stroke?: string;
  strokeWidth?: number;
  shadow?: 0 | 1 | 2 | 3 | 4 | 5;
  shadowColor?: string;
  tracking?: number;
};

export function textPaint(draft: TextDraft): Partial<Clip> {
  return {
    color: draft.color ?? "#f7f7f8",
    plate: draft.plate,
    stroke: draft.stroke,
    strokeWidth: draft.strokeWidth,
    shadow: draft.shadow,
    shadowColor: draft.shadowColor,
    tracking: draft.tracking,
    font: draft.font,
    bold: draft.bold,
  };
}

export function lookPreviewStyle(look: TextLook) {
  const font = textFont({ font: look.font, bold: true });
  const glow = look.shadowColor ?? look.color;
  let textShadow = "none";
  if (look.shadow === 1) textShadow = "0 2px 6px rgba(0,0,0,0.8)";
  else if (look.shadow === 2) textShadow = `0 0 6px ${glow}, 0 0 14px ${glow}`;
  else if (look.shadow === 3) textShadow = "2px 2px 0 #3a3a42";
  return {
    fontFamily: font.family,
    fontWeight: font.weight,
    color: look.color === "transparent" ? "transparent" : look.color,
    WebkitTextStroke: look.stroke !== "none" ? `1px ${look.stroke}` : "0px transparent",
    textShadow,
    letterSpacing: `${look.tracking}em`,
    backgroundColor: look.plate ? "rgba(8,8,10,0.72)" : "transparent",
    borderRadius: look.plate ? "4px" : "0",
    padding: look.plate ? "1px 6px" : "0",
  };
}

export function textFont(clip: { font?: string; bold?: boolean }) {
  const found = TEXT_FONTS.find((item) => item.id === clip.font) ?? TEXT_FONTS[0];
  return {
    id: found?.id ?? "jakarta",
    label: found?.label ?? "Jakarta",
    family: found?.family ?? '"Plus Jakarta Sans", sans-serif',
    weight: clip.bold ? (found?.bold ?? 800) : (found?.weight ?? 600),
  };
}

export const VISUALS: { id: GeneratorId; name: string }[] = [
  { id: "neon", name: "Ciudad neón" },
  { id: "tide", name: "Marea" },
  { id: "bokeh", name: "Luces" },
  { id: "film", name: "Película" },
  { id: "pulse", name: "Pulso" },
  { id: "dusk", name: "Atardecer" },
];

export const AUDIO_GENS: { id: AudioGenId; name: string }[] = [
  { id: "lofi", name: "Lo-fi noche" },
  { id: "keys", name: "Teclas" },
  { id: "air", name: "Aire" },
];

export const STICKERS: { id: StickerId; name: string }[] = [
  { id: "star", name: "Estrella" },
  { id: "ring", name: "Aro" },
  { id: "burst", name: "Destello" },
  { id: "badge", name: "Etiqueta" },
  { id: "arrow", name: "Flecha" },
  { id: "spark", name: "Chispas" },
  { id: "note", name: "Nota" },
  { id: "heart", name: "Corazón" },
  { id: "fire", name: "Fuego" },
  { id: "bolt", name: "Rayo" },
  { id: "mic", name: "Micro" },
  { id: "vinyl", name: "Vinilo" },
  { id: "crown", name: "Corona" },
  { id: "play", name: "Play" },
];

export const TEXT_PRESETS: TextDraft[] = [
  { name: "Título", text: "TU TÍTULO", fontSize: 92, anim: "pop", bold: true, font: "bebas", duration: 3, y: -0.04 },
  { name: "Subtítulo", text: "Una línea corta", fontSize: 46, anim: "fade", font: "montserrat", duration: 3, y: 0.16 },
  {
    name: "Pie",
    text: "Nombre  ·  @usuario",
    fontSize: 34,
    anim: "slide",
    plate: true,
    align: "left",
    font: "barlow",
    y: 0.34,
    duration: 4,
  },
  { name: "Frase", text: "Esto engancha desde el primer segundo", fontSize: 58, anim: "type", bold: true, font: "jakarta", duration: 4 },
  { name: "Slam", text: "EL HOOK", fontSize: 96, anim: "slam", bold: true, font: "anton", duration: 2.2, y: -0.06 },
  { name: "Bounce", text: "ENTRA YA", fontSize: 72, anim: "bounce", bold: true, font: "lilita", duration: 2.4 },
];

let seq = 1;
export function uid(prefix = "c") {
  seq += 1;
  return `${prefix}${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function makeClip(
  partial: Partial<Clip> & Pick<Clip, "id" | "type" | "trackId" | "name" | "start" | "duration">,
): Clip {
  return {
    inPoint: 0,
    speed: 1,
    volume: 1,
    opacity: 1,
    filter: "none",
    effect: "none",
    brightness: 1,
    contrast: 1,
    saturate: 1,
    temperature: 0,
    tint: 0,
    wash: 0,
    vignette: 0,
    transition: "none",
    transitionDur: 0.5,
    fadeIn: 0,
    fadeOut: 0,
    fit: "cover",
    enter: "none",
    middle: "none",
    leave: "none",
    enterDur: 0.4,
    leaveDur: 0.4,
    ...partial,
  };
}

export const DEMO_CLIPS: Clip[] = [
  makeClip({
    id: "d-neon",
    type: "generator",
    trackId: "v1",
    name: "Ciudad neón",
    start: 0,
    duration: 5.2,
    generator: "neon",
  }),
  makeClip({
    id: "d-tide",
    type: "generator",
    trackId: "v1",
    name: "Marea",
    start: 5.2,
    duration: 5.2,
    generator: "tide",
    transition: "fade",
    transitionDur: 0.55,
  }),
  makeClip({
    id: "d-title",
    type: "text",
    trackId: "t1",
    name: "Título",
    start: 0.35,
    duration: 3.1,
    text: "TU HISTORIA",
    fontSize: 108,
    anim: "pop",
    y: -0.08,
    ...lookFields(TEXT_LOOKS.find((item) => item.id === "oro") ?? TEXT_LOOKS[0]!),
  }),
  makeClip({
    id: "d-sub",
    type: "text",
    trackId: "t1",
    name: "Subtítulo",
    start: 3.55,
    duration: 3,
    text: "Corta. Ritmo. Publica.",
    fontSize: 42,
    anim: "slide",
    y: 0.22,
    ...lookFields(TEXT_LOOKS.find((item) => item.id === "placa") ?? TEXT_LOOKS[0]!),
  }),
  makeClip({
    id: "d-spark",
    type: "sticker",
    trackId: "o1",
    name: "Chispas",
    start: 6.5,
    duration: 3,
    generator: "spark",
    x: 0.24,
    y: -0.24,
  }),
  makeClip({
    id: "d-audio",
    type: "audio",
    trackId: "a1",
    name: "Lo-fi noche",
    start: 0,
    duration: 10.4,
    generator: "lofi",
    volume: 0.85,
    fadeIn: 0.12,
    fadeOut: 0.7,
  }),
];

/** Clips activos (sin los desactivados con V). */
export function liveClips<T extends { disabled?: boolean }>(clips: T[]): T[] {
  return clips.some((c) => c.disabled) ? clips.filter((c) => !c.disabled) : clips;
}
