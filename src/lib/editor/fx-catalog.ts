export type FxRecipe = {
  filter?: string;
  blur?: number;
  hue?: number;
  shake?: number;
  vshake?: number;
  hshake?: number;
  zoom?: number;
  zoomBase?: number;
  zoomSpeed?: number;
  snap?: number;
  spin?: number;
  spinSpeed?: number;
  pan?: number;
  panSpeed?: number;
  drift?: number;
  bounce?: number;
  fish?: number;
  stretch?: number;
  pixel?: number;
  tiles?: number;
  mirror?: "x" | "y" | "both";
  slices?: number;
  glitch?: number;
  wave?: number;
  heat?: number;
  whip?: number;
  rgb?: number;
  prism?: number;
  split?: number;
  kaleido?: number;
  flash?: number;
  flashColor?: string;
  flashSpeed?: number;
  black?: number;
  grain?: number;
  scan?: number;
  vignette?: number;
  letterbox?: number;
  leak?: string;
  leak2?: string;
  rain?: number;
  snow?: number;
  sparks?: number;
  ember?: number;
  dust?: number;
  fog?: number;
  bits?: number;
  bitColor?: string;
  stars?: number;
  aura?: number;
  auraColor?: string;
  lines?: number;
  lineColor?: string;
  shock?: number;
  shockColor?: string;
  hud?: number;
  burn?: number;
  strobe?: number;
  vhs?: number;
  negative?: number;
  halftone?: number;
  bloom?: number;
  ghost?: number;
  edge?: number;
  flicker?: number;
  clock?: number;
  ink?: number;
  portal?: number;
  matrix?: number;
  tv?: number;
  rec?: number;
  gate?: number;
  frame?: number;
  tilt?: number;
  bolt?: number;
};

export type FxItem = {
  id: string;
  name: string;
  group: string;
  tags: string;
  recipe?: FxRecipe;
};

export const LEGACY_FX = new Set([
  "none",
  "pixel",
  "chroma",
  "scan",
  "flash",
  "oldcam",
  "noise",
  "burn",
  "slices",
  "negative",
  "halftone",
  "mirror",
  "tiles",
  "blur",
  "key",
  "zoom",
  "dizzy",
  "sharpen",
  "mutation",
]);

type Row = [string, string, string, FxRecipe | null];

const items: FxItem[] = [];
const recipes = new Map<string, FxRecipe>();
const seen = new Set<string>();

function add(group: string, rows: Row[]) {
  for (const [id, name, tags, recipe] of rows) {
    if (seen.has(id)) throw new Error(`Efecto repetido: ${id}`);
    seen.add(id);
    const legacy = LEGACY_FX.has(id);
    if (!recipe && id !== "none" && !legacy) throw new Error(`Sin receta: ${id}`);
    items.push({ id, name, group, tags, ...(recipe && !legacy ? { recipe } : {}) });
    if (recipe && !legacy) recipes.set(id, recipe);
  }
}

const cine = "contrast(1.18) saturate(0.84) brightness(0.96)";
const teal = "sepia(0.35) hue-rotate(155deg) saturate(0.9) contrast(1.2)";
const warm = "sepia(0.45) saturate(1.25) brightness(1.04)";
const noir = "grayscale(1) contrast(1.45) brightness(0.9)";
const vivid = "saturate(1.7) contrast(1.12)";
const neon = "saturate(1.8) contrast(1.2) hue-rotate(-12deg)";
const matte = "contrast(0.82) brightness(1.12) saturate(0.72)";
const night = "brightness(0.72) contrast(1.28) saturate(0.85) hue-rotate(12deg)";
const dream = "contrast(0.86) brightness(1.12) saturate(0.8)";
const comic = "contrast(1.6) saturate(1.5)";

add("Tendencia", [
  ["tt-velocity", "Velocity edit", "velocity edit tiktok zoom punch beat", { snap: 0.28, zoomSpeed: 8, zoomBase: 1.08, whip: 0.85, shake: 0.32, flash: 0.45, blur: 1.2 }],
  ["tt-mblur", "Motion blur", "motion blur tiktok", { whip: 1.15, blur: 3.5, pan: 0.35, panSpeed: 2.2 }],
  ["tt-shake", "Camera shake", "camera shake handheld", { shake: 0.85, zoomBase: 1.06, grain: 0.15 }],
  ["tt-slow", "Cámara lenta suave", "smooth slow motion", { blur: 5, ghost: 1.1, zoom: 0.03, zoomSpeed: 1.2, bloom: 0.6 }],
  ["tt-rgb", "RGB split", "rgb split chromatic", { rgb: 1.6, glitch: 0.25, scan: 0.2 }],
  ["tt-grade", "Color cine", "cinematic color grade teal orange", { filter: teal, vignette: 0.45, grain: 0.2, leak: "#ff8a3d" }],
  ["tt-zoom", "Zoom in / out", "zoom in out punch", { zoom: 0.16, zoomSpeed: 2.4, zoomBase: 1.12, blur: 0.6 }],
  ["tt-beat", "Beat sync", "beat sync zoom flash", { snap: 0.22, zoomSpeed: 7.4, flash: 0.35, shake: 0.18 }],
  ["tt-flare", "Destello de lente", "lens flare", { leak: "#fff1c9", leak2: "#7ad7ff", bloom: 1.1 }],
  ["tt-leak", "Fuga de luz", "light leak", { leak: "#ffb15a", leak2: "#ff4f8b", grain: 0.25, filter: warm }],
  ["tt-impact", "Impacto anime", "anime impact manga", { lines: 1, lineColor: "#f3f3f5", shock: 1, flash: 0.55, shake: 0.4, zoomBase: 1.08 }],
  ["tt-holo", "Holograma", "hologram", { scan: 0.8, rgb: 0.7, filter: "hue-rotate(160deg) saturate(1.3) brightness(1.05)", flicker: 0.45 }],
  ["tt-vhs", "VHS", "vhs tape", { vhs: 1, rgb: 0.55, filter: "contrast(1.15) saturate(1.2)" }],
  ["tt-glitch", "Glitch", "glitch digital", { glitch: 1, rgb: 0.8, scan: 0.35, flashColor: "#00d4c8", flash: 0.2 }],
  ["tt-3d", "Zoom 3D", "3d zoom capcut", { snap: 0.2, zoomSpeed: 5, zoomBase: 1.16, whip: 0.4, vignette: 0.25, blur: 0.8 }],
  ["tt-dolly", "Dolly zoom", "dolly zoom vertigo", { zoom: 0.14, zoomSpeed: 0.9, zoomBase: 1.2, stretch: 0.12, blur: 1.4, vignette: 0.35 }],
  ["tt-track", "Tracking suave", "smooth tracking pan", { pan: 0.55, panSpeed: 0.7, drift: 0.2, zoomBase: 1.08, blur: 0.4 }],
  ["tt-warp", "Warp", "warp distort", { wave: 1, fish: 0.35, rgb: 0.3 }],
  ["tt-flash", "Flash de corte", "flash transition", { flash: 1, flashSpeed: 7, shake: 0.2, zoomBase: 1.04 }],
  ["tt-letter", "Letterbox cine", "cinematic letterbox bars", { letterbox: 0.14, vignette: 0.35, filter: cine }],
]);

add("Transiciones", [
  ["tr-zoom-in", "Zoom de entrada", "zoom in", { zoomBase: 1.35, zoom: 0.08, zoomSpeed: 2, blur: 0.8 }],
  ["tr-zoom-out", "Zoom de salida", "zoom out", { zoomBase: 0.82, zoom: 0.06, zoomSpeed: 1.6, vignette: 0.2 }],
  ["tr-push-l", "Empuje izquierda", "push left", { pan: -1, panSpeed: 1.6, whip: 0.45 }],
  ["tr-push-r", "Empuje derecha", "push right", { pan: 1, panSpeed: 1.6, whip: 0.45 }],
  ["tr-slide-up", "Deslizar arriba", "slide up", { bounce: 0.9, whip: 0.2 }],
  ["tr-slide-down", "Deslizar abajo", "slide down", { bounce: -0.9, whip: 0.25 }],
  ["tr-spin", "Giro de corte", "spin transition", { spin: 0.22, spinSpeed: 3, zoomBase: 1.12, flash: 0.25 }],
  ["tr-whip", "Látigo", "whip pan", { whip: 1.3, pan: 1, panSpeed: 2.6, blur: 2 }],
  ["tr-mblur", "Corte con blur", "motion blur cut", { blur: 7, whip: 0.7, flash: 0.2 }],
  ["tr-flash", "Flash de transición", "flash transition white", { flash: 0.85, flashSpeed: 9, zoom: 0.05, zoomSpeed: 8 }],
  ["flash", "Flash blanco", "white flash", null],
  ["tr-black", "Flash negro", "black flash", { black: 1, flashSpeed: 6 }],
  ["tr-rgb", "Corte RGB", "rgb split transition", { rgb: 1.8, whip: 0.35, glitch: 0.3 }],
  ["tr-glitch", "Corte glitch", "glitch cut", { glitch: 1.1, rgb: 0.9, slices: 0.4, flash: 0.15, flashColor: "#ff3b6a" }],
  ["tr-shake", "Corte con temblor", "shake transition", { shake: 1, flash: 0.3, zoomBase: 1.05 }],
  ["blur", "Desenfoque de corte", "blur transition", null],
  ["tr-lens", "Distorsión de lente", "lens distortion", { fish: 0.7, zoomBase: 1.08, vignette: 0.35 }],
  ["tr-fish", "Ojo de pez", "fisheye transition", { fish: 1, zoomBase: 1.16, vignette: 0.45 }],
  ["tr-warp", "Deformación", "warp transition", { wave: 1.2, heat: 0.4, rgb: 0.25 }],
  ["tr-vhs", "Corte VHS", "vhs transition", { vhs: 1, rgb: 0.7, glitch: 0.35, filter: "saturate(1.3) contrast(1.1)" }],
  ["burn", "Quemadura de filme", "film burn", null],
  ["tr-ink", "Tinta", "ink transition", { ink: 1, flash: 0.15, flashColor: "#0c0c0e" }],
  ["tr-leak", "Fuga de luz", "light leak transition", { leak: "#ffc56e", leak2: "#ff5ea8", bloom: 0.7, grain: 0.2 }],
  ["tr-swipe", "Barrido", "swipe transition", { pan: 1, panSpeed: 2.1, whip: 0.8, flash: 0.15 }],
  ["tr-flip", "Volteo de cámara", "camera flip", { spin: 0.55, spinSpeed: 2.4, zoomBase: 1.1 }],
  ["tr-cube", "Giro de cubo", "cube rotation", { spin: 0.35, pan: 0.8, panSpeed: 1.8, split: 0.6 }],
  ["tr-page", "Paso de página", "page turn", { pan: -0.7, panSpeed: 1.1, whip: 0.3, vignette: 0.25 }],
  ["tr-ripple", "Onda", "ripple transition", { wave: 1.3, zoom: 0.04, zoomSpeed: 3 }],
  ["tr-melt", "Derretido", "liquid melt", { heat: 1.2, wave: 0.5, filter: "saturate(1.2) contrast(0.95)" }],
  ["tr-morph", "Fundido morph", "morph cut", { blur: 4, ghost: 0.8, zoom: 0.04, zoomSpeed: 1.5 }],
  ["tr-stretch", "Estirado", "stretch transition", { stretch: 0.45, zoomBase: 1.05, whip: 0.2 }],
  ["tr-strobe", "Estrobo", "strobe flash", { strobe: 1, shake: 0.15 }],
  ["tr-prism", "Prisma", "prism transition", { prism: 1.3, zoomBase: 1.06, bloom: 0.4 }],
  ["tr-split", "Pantalla partida", "split screen", { split: 1, zoomBase: 1.02 }],
  ["mirror", "Espejo", "mirror flip", null],
  ["tr-radial", "Desenfoque radial", "radial blur zoom", { zoomBase: 1.2, blur: 6, vignette: 0.3 }],
  ["tr-clock", "Reloj", "clock wipe", { clock: 1, vignette: 0.15 }],
  ["tr-pixel", "Disolución pixel", "pixel dissolve", { pixel: 2.8, glitch: 0.2, flash: 0.12 }],
  ["tr-smoke", "Humo", "smoke transition", { fog: 1.4, blur: 1.5, leak: "#d7dde4" }],
  ["tr-fire", "Fuego", "fire transition", { burn: 1, ember: 1, leak: "#ff5a1f", flicker: 0.25 }],
  ["tr-boom", "Explosión", "explosion transition", { shock: 1, flash: 0.8, shake: 0.7, ember: 0.8, zoomBase: 1.1 }],
  ["tr-parts", "Partículas", "particle transition", { sparks: 1.2, bits: 0.8, bitColor: "#00d4c8", flash: 0.25 }],
  ["tr-neon", "Barrido neón", "neon wipe", { pan: 1, panSpeed: 1.8, edge: 1, filter: neon, leak: "#00d4c8" }],
  ["tr-energy", "Estallido de energía", "energy burst", { aura: 1, auraColor: "#7cf4ff", shock: 1, flash: 0.4, flashColor: "#b8fff8" }],
  ["tr-holo", "Corte holograma", "hologram transition", { rgb: 0.8, scan: 1, flicker: 0.5, filter: "hue-rotate(180deg) saturate(1.4)" }],
  ["tr-stars", "Campo de estrellas", "starfield transition", { stars: 1.4, zoomBase: 1.15, zoom: 0.05, zoomSpeed: 1.2, filter: night }],
  ["tr-portal", "Portal", "portal transition", { portal: 1, zoom: 0.08, zoomSpeed: 2, aura: 0.7, auraColor: "#7a5cff", hue: 30 }],
  ["tr-fade", "Fundido cine", "cinematic fade", { black: 0.7, letterbox: 0.08, filter: cine, vignette: 0.3 }],
  ["tr-dzoom", "Zoom dinámico", "dynamic zoom", { snap: 0.24, zoomSpeed: 6.5, zoomBase: 1.1, shake: 0.12, blur: 0.7 }],
  ["tr-mask", "Máscara", "mask transition vignette", { vignette: 0.85, zoomBase: 1.08, clock: 0.45 }],
]);

add("Movimiento", [
  ["mx-shake", "Temblor de cámara", "camera shake", { shake: 0.7, zoomBase: 1.05 }],
  ["mx-quake", "Terremoto", "earthquake", { shake: 1.15, vshake: 1.3, hshake: 0.7, zoom: 0.02, zoomSpeed: 14 }],
  ["mx-hand", "Cámara en mano", "handheld camera", { shake: 0.32, drift: 0.35, spin: 0.03, zoom: 0.025, zoomSpeed: 1.4 }],
  ["mx-smooth", "Zoom suave", "smooth zoom", { zoom: 0.08, zoomSpeed: 1.1, zoomBase: 1.08 }],
  ["mx-bounce", "Rebote", "bounce", { bounce: 1, zoomBase: 1.04 }],
  ["mx-swing", "Balanceo", "swing", { spin: 0.08, spinSpeed: 1.3, drift: 0.25 }],
  ["mx-wiggle", "Meneo", "wiggle", { shake: 0.28, spin: 0.045, spinSpeed: 4, zoomBase: 1.03 }],
  ["mx-pendulum", "Péndulo", "pendulum", { spin: 0.12, spinSpeed: 1.6, zoomBase: 1.06 }],
  ["mx-rotshake", "Temblor con giro", "rotation shake", { shake: 0.55, spin: 0.1, spinSpeed: 6 }],
  ["mx-vshake", "Temblor vertical", "vertical shake", { vshake: 1.1, zoomBase: 1.06 }],
  ["mx-hshake", "Temblor horizontal", "horizontal shake", { hshake: 1.15, zoomBase: 1.04 }],
  ["mx-pan", "Paneo dinámico", "dynamic pan", { pan: 0.9, panSpeed: 0.85, zoomBase: 1.1 }],
  ["mx-orbit", "Órbita", "orbit camera", { spin: 0.14, spinSpeed: 0.8, zoomBase: 1.12, drift: 0.2 }],
  ["mx-dolly", "Dolly zoom", "dolly zoom", { zoom: 0.12, zoomSpeed: 0.85, stretch: 0.16, zoomBase: 1.18, blur: 1 }],
  ["mx-roll", "Cámara rodando", "rolling camera", { spin: 0.2, spinSpeed: 0.7, zoomBase: 1.14 }],
  ["mx-snap", "Snap zoom", "snap zoom", { snap: 0.34, zoomSpeed: 7, zoomBase: 1.05, blur: 0.5 }],
  ["mx-punch", "Zoom de golpe", "punch zoom", { snap: 0.4, zoomSpeed: 8.5, shake: 0.35, flash: 0.35, zoomBase: 1.06 }],
  ["mx-hyper", "Hiper zoom", "hyper zoom", { zoomBase: 1.45, snap: 0.2, zoomSpeed: 4, blur: 1.5, vignette: 0.3 }],
  ["mx-jitter", "Jitter", "jitter", { shake: 0.45, glitch: 0.15, zoomSpeed: 16, zoom: 0.02 }],
  ["mx-velocity", "Velocity", "velocity edit", { snap: 0.26, zoomSpeed: 8.2, whip: 0.7, shake: 0.22, flash: 0.3 }],
  ["mx-ramp", "Rampa de velocidad", "speed ramp", { whip: 0.5, blur: 2.5, snap: 0.12, zoomSpeed: 3.2, zoomBase: 1.08 }],
  ["mx-twarp", "Tiempo torcido", "time warp", { ghost: 1, blur: 2, hue: 20, zoom: 0.05, zoomSpeed: 2 }],
  ["mx-reverse", "Eco inverso", "reverse motion echo", { ghost: 1.3, whip: -0.2, slices: 0.35, blur: 0.6 }],
  ["mx-slow", "Cámara lenta", "slow motion", { blur: 6, ghost: 1.2, bloom: 0.5, zoom: 0.025, zoomSpeed: 0.8 }],
  ["mx-fast", "Movimiento rápido", "fast motion", { whip: 0.9, shake: 0.25, blur: 1.2, pan: 0.4, panSpeed: 3 }],
  ["mx-freeze", "Marco quieto", "freeze frame look", { filter: "contrast(1.25) saturate(0.75)", vignette: 0.4, flash: 0.18, grain: 0.15 }],
  ["mx-track", "Tracking", "tracking motion", { pan: 0.65, panSpeed: 0.55, zoomBase: 1.12, shake: 0.08 }],
  ["mx-follow", "Seguir objeto", "follow object", { pan: 0.4, panSpeed: 1.1, vshake: 0.15, zoom: 0.04, zoomSpeed: 1.5, zoomBase: 1.1 }],
  ["mx-3d", "Cámara 3D", "3d camera move", { pan: 0.5, spin: 0.06, zoom: 0.06, zoomSpeed: 1.2, zoomBase: 1.1 }],
  ["mx-tilt", "Inclinar", "tilt motion", { spin: 0.1, spinSpeed: 0.9, drift: 0.15 }],
  ["mx-drift", "Deriva", "drift motion", { drift: 1, zoom: 0.03, zoomSpeed: 0.6, zoomBase: 1.05 }],
  ["mx-elastic", "Elástico", "elastic motion", { stretch: 0.35, bounce: 0.6, zoomBase: 1.04 }],
  ["mx-stretch", "Estirar", "stretch motion", { stretch: 0.55, zoomBase: 1.02 }],
  ["mx-pull", "Enfoque atrás", "pull focus", { blur: 3.5, zoomBase: 0.96, vignette: 0.15 }],
  ["mx-push", "Enfoque adelante", "push focus", { blur: 2.2, zoomBase: 1.18, bloom: 0.35 }],
  ["mx-ctilt", "Tilt de cámara", "camera tilt dutch", { spin: 0.16, spinSpeed: 0.45, zoomBase: 1.12 }],
  ["mx-float", "Cámara flotante", "floating camera", { drift: 0.7, bounce: 0.35, zoom: 0.03, zoomSpeed: 0.7 }],
  ["mx-cine", "Deriva cine", "cinematic drift", { drift: 0.45, zoom: 0.05, zoomSpeed: 0.45, zoomBase: 1.08, filter: cine, vignette: 0.25 }],
  ["mx-impact", "Temblor de impacto", "impact shake", { shake: 1, flash: 0.55, snap: 0.12, zoomSpeed: 9, zoomBase: 1.04 }],
  ["mx-bass", "Temblor de bajo", "bass shake", { vshake: 0.9, shake: 0.25, zoom: 0.04, zoomSpeed: 7 }],
  ["mx-beat", "Pulso al beat", "beat sync", { snap: 0.18, zoomSpeed: 7.6, flash: 0.22, shake: 0.12 }],
  ["mx-sway", "Vaivén", "sway", { spin: 0.06, spinSpeed: 1.1, drift: 0.4 }],
  ["mx-orbitz", "Órbita con zoom", "orbit zoom", { spin: 0.12, zoom: 0.1, zoomSpeed: 0.8, zoomBase: 1.1 }],
  ["mx-spinz", "Giro con zoom", "spin zoom", { spin: 0.28, spinSpeed: 1.4, zoomBase: 1.18, blur: 0.6 }],
  ["mx-fly", "Atravesar", "fly through", { zoomBase: 1.28, zoom: 0.1, zoomSpeed: 1.3, whip: 0.35, vignette: 0.2 }],
  ["mx-rush", "Embestida", "rush effect", { whip: 1, pan: 1, panSpeed: 2.4, shake: 0.3, blur: 1.5, zoomBase: 1.08 }],
  ["mx-dynrot", "Giro dinámico", "dynamic rotation", { spin: 0.24, spinSpeed: 2.2, shake: 0.12 }],
  ["mx-warpz", "Zoom deformado", "warp zoom", { zoomBase: 1.2, fish: 0.45, wave: 0.4 }],
  ["mx-kinetic", "Cámara kinética", "kinetic camera", { shake: 0.4, snap: 0.14, zoomSpeed: 6, pan: 0.35, panSpeed: 2, whip: 0.3 }],
  ["mx-vortex", "Vórtice", "vortex motion", { spin: 0.4, spinSpeed: 1.1, zoomBase: 1.2, fish: 0.3, blur: 0.8 }],
]);

add("Visual", [
  ["vis-rgb", "RGB split", "rgb split", { rgb: 1.7 }],
  ["chroma", "Aberración cromática", "chromatic aberration", null],
  ["vis-vhs", "VHS", "vhs", { vhs: 1, rgb: 0.45, filter: "contrast(1.12) saturate(1.15)" }],
  ["vis-crt", "Pantalla CRT", "crt screen", { scan: 1, vignette: 0.55, fish: 0.18, filter: "contrast(1.15) saturate(1.05)" }],
  ["vis-static", "Estática de TV", "tv static", { tv: 1, scan: 0.45, flicker: 0.35 }],
  ["noise", "Ruido de filme", "noise film grain", null],
  ["vis-grain", "Grano", "grain film", { grain: 0.9, filter: "contrast(1.06) saturate(0.92)" }],
  ["vis-glitch", "Glitch", "glitch", { glitch: 0.9, rgb: 0.55 }],
  ["vis-dglitch", "Glitch digital", "digital glitch", { glitch: 1.1, pixel: 1.2, rgb: 0.7, scan: 0.3 }],
  ["vis-datamosh", "Datamosh", "datamosh", { slices: 0.8, glitch: 0.6, rgb: 0.4, ghost: 0.5 }],
  ["vis-holo", "Holograma", "hologram", { scan: 0.9, rgb: 0.65, flicker: 0.4, filter: "hue-rotate(170deg) saturate(1.25) brightness(1.05)" }],
  ["vis-cyber", "Brillo cyberpunk", "cyberpunk glow", { filter: neon, bloom: 1, edge: 0.8, leak: "#ff2bd6", leak2: "#00d4c8" }],
  ["vis-edge", "Borde neón", "neon edge", { edge: 1.2, filter: "contrast(1.3) saturate(1.4)", bloom: 0.4 }],
  ["vis-retro", "Retrowave", "retro wave synthwave", { filter: "sepia(0.3) hue-rotate(-28deg) saturate(1.45) contrast(1.1)", scan: 0.35, leak: "#ff4fa3" }],
  ["vis-bloom", "Bloom", "bloom glow", { bloom: 1.3, filter: "contrast(1.05) brightness(1.04)" }],
  ["vis-bokeh", "Bokeh", "bokeh", { blur: 2.2, bloom: 1.4, vignette: 0.25 }],
  ["vis-flare", "Destello de lente", "lens flare", { leak: "#fff4d2", leak2: "#9ad8ff", bloom: 0.9 }],
  ["vis-rays", "Rayos de luz", "light rays", { leak: "#ffe7b0", bloom: 0.7, lines: 0.35, lineColor: "rgba(255,220,160,0.9)" }],
  ["vis-god", "Rayos de sol", "god rays", { leak: "#ffd27a", bloom: 1, fog: 0.35, filter: warm }],
  ["vis-double", "Doble exposición", "double exposure", { ghost: 0.9, filter: "saturate(1.15) contrast(1.05)", leak: "#7eb6ff" }],
  ["vis-ghost", "Fantasma", "ghost effect", { ghost: 1.4, filter: "brightness(1.05) saturate(0.8)" }],
  ["vis-clone", "Clon", "clone effect echo", { ghost: 1, tiles: 2, rgb: 0.2 }],
  ["vis-echo", "Estela", "echo trail", { ghost: 1.5, whip: 0.25 }],
  ["vis-trail", "Estela de movimiento", "motion trail", { whip: 0.85, ghost: 0.6, blur: 0.8 }],
  ["vis-pglow", "Brillo de partículas", "particle glow", { sparks: 1, bloom: 0.8, bits: 0.4, bitColor: "#7ef6ff" }],
  ["vis-aura", "Aura de energía", "energy aura", { aura: 1, auraColor: "#5ef2ff", bloom: 0.4 }],
  ["vis-bolt", "Relámpago", "lightning", { bolt: 1, flicker: 0.2, filter: "brightness(1.05) contrast(1.1)" }],
  ["vis-sparks", "Chispas eléctricas", "electric sparks", { sparks: 1.3, edge: 0.4, flicker: 0.15 }],
  ["vis-laser", "Láser", "laser", { lines: 0.2, lineColor: "#ff3355", leak: "#ff3355", edge: 0.5 }],
  ["vis-heat", "Distorsión de calor", "heat distortion", { heat: 1.1 }],
  ["vis-water", "Distorsión de agua", "water distortion", { wave: 1, filter: "saturate(1.05) hue-rotate(12deg)" }],
  ["vis-glass", "Refracción de vidrio", "glass refraction", { wave: 0.6, rgb: 0.45, bloom: 0.35 }],
  ["vis-crystal", "Cristal", "crystal", { prism: 1, kaleido: 0.4, bloom: 0.3 }],
  ["vis-ice", "Hielo", "ice freeze", { filter: "saturate(0.55) hue-rotate(18deg) brightness(1.12) contrast(1.05)", bloom: 0.5, fog: 0.25 }],
  ["vis-fire", "Fuego encima", "fire overlay", { burn: 0.9, ember: 1.1, leak: "#ff4d12" }],
  ["vis-smoke", "Humo encima", "smoke overlay", { fog: 1.1, dust: 0.4, filter: "saturate(0.8) contrast(0.95)" }],
  ["vis-fog", "Niebla", "fog", { fog: 1.3, filter: "brightness(1.04) saturate(0.75)" }],
  ["vis-dust", "Polvo", "dust particles", { dust: 1.2, grain: 0.2 }],
  ["vis-snow", "Nieve", "snow", { snow: 1.2, filter: "brightness(1.06) saturate(0.85)" }],
  ["vis-rain", "Lluvia", "rain", { rain: 1.2, filter: "brightness(0.92) saturate(0.8) contrast(1.05)" }],
  ["vis-meteor", "Meteoros", "meteor", { bits: 0.7, bitColor: "#ffd27a", stars: 0.6, whip: 0.15 }],
  ["vis-galaxy", "Galaxia", "galaxy overlay", { stars: 1.3, filter: "saturate(1.2) hue-rotate(230deg) brightness(0.85)", bloom: 0.6, vignette: 0.35 }],
  ["vis-stars", "Estrellas", "star overlay", { stars: 1.5 }],
  ["vis-aurora", "Aurora", "aurora", { leak: "#3dff9a", leak2: "#7a5cff", wave: 0.25, bloom: 0.5 }],
  ["vis-plasma", "Plasma", "plasma", { hue: 80, bloom: 0.7, wave: 0.35, filter: vivid }],
  ["vis-fractal", "Fractal", "fractal", { kaleido: 1, hue: 40, zoomBase: 1.05 }],
  ["vis-portal", "Portal", "portal", { portal: 1, aura: 0.8, auraColor: "#9b7bff", zoom: 0.04, zoomSpeed: 2 }],
  ["vis-hud", "HUD sci-fi", "sci-fi hud", { hud: 1, scan: 0.45, filter: "saturate(0.9) contrast(1.1)" }],
  ["vis-matrix", "Código matrix", "matrix code", { matrix: 1, filter: "saturate(0.7) hue-rotate(80deg) brightness(0.9)" }],
  ["scan", "Escaneo digital", "digital scan", null],
]);

add("Color", [
  ["co-teal", "Teal y naranja", "cinematic teal orange", { filter: teal, leak: "#ff8a3d", vignette: 0.4, grain: 0.15 }],
  ["co-hollywood", "Hollywood", "hollywood look", { filter: cine, leak: "#f0b429", vignette: 0.35, grain: 0.12 }],
  ["co-block", "Bloque", "blockbuster color", { filter: "contrast(1.32) saturate(1.15)", leak: "#ff7a2f", leak2: "#0e7490", vignette: 0.4 }],
  ["co-scurve", "Curva S", "s-curve contrast", { filter: "contrast(1.4) saturate(1.05) brightness(0.98)", vignette: 0.2 }],
  ["co-hdr", "HDR", "hdr effect", { filter: "contrast(1.35) saturate(1.4) brightness(1.06)", bloom: 0.45 }],
  ["co-kodak", "Kodak", "film kodak portra", { filter: warm, grain: 0.35, vignette: 0.22 }],
  ["co-fuji", "Fuji", "fuji film", { filter: "sepia(0.2) hue-rotate(28deg) saturate(1.1) contrast(1.04)", grain: 0.28, leak: "#86efac" }],
  ["co-vintage", "Vintage", "vintage film", { filter: "sepia(0.5) contrast(0.95) brightness(1.05)", grain: 0.4, vignette: 0.28 }],
  ["co-90s", "Años 90", "retro 90s", { filter: "saturate(1.25) contrast(1.08) hue-rotate(-8deg)", grain: 0.2, leak: "#ff8ad4" }],
  ["co-sepia", "Sepia", "sepia", { filter: "sepia(0.85) saturate(0.7) contrast(1.05)", vignette: 0.3 }],
  ["co-bw", "Blanco y negro", "black and white", { filter: "grayscale(1) contrast(1.12)" }],
  ["co-noir", "Noir", "noir", { filter: noir, vignette: 0.55, grain: 0.25 }],
  ["co-moody", "Moody", "moody dark", { filter: "brightness(0.82) contrast(1.22) saturate(0.7)", vignette: 0.5 }],
  ["co-gold", "Hora dorada", "golden hour", { filter: warm, leak: "#ffb347", bloom: 0.45 }],
  ["co-sunset", "Atardecer", "sunset glow", { filter: "sepia(0.4) saturate(1.4) hue-rotate(-16deg)", leak: "#ff5a36", bloom: 0.35 }],
  ["co-cold", "Azul frío", "cold blue", { filter: "saturate(0.75) hue-rotate(20deg) brightness(1.05) contrast(1.05)", leak: "#7eb6ff" }],
  ["co-cyber", "Azul cyber", "cyber blue", { filter: "hue-rotate(190deg) saturate(1.3) contrast(1.15) brightness(0.95)", bloom: 0.4, leak: "#22d3ee" }],
  ["co-purple", "Neón púrpura", "purple neon", { filter: neon, leak: "#c084fc", leak2: "#f0abfc", bloom: 0.5 }],
  ["co-vapor", "Vaporwave", "vaporwave", { filter: "saturate(1.35) hue-rotate(-24deg) contrast(1.05)", leak: "#67e8f9", leak2: "#f9a8d4", scan: 0.2 }],
  ["co-anime", "Look anime", "anime look", { filter: comic, bloom: 0.35, edge: 0.35 }],
  ["co-dream", "Brillo de sueño", "dreamy glow", { filter: dream, bloom: 1, leak: "#f9a8d4" }],
  ["co-soft", "Luz suave", "soft light", { filter: "brightness(1.1) contrast(0.92) saturate(0.9)", bloom: 0.55 }],
  ["co-high", "Alto contraste", "high contrast", { filter: "contrast(1.55) saturate(1.1)" }],
  ["co-low", "Bajo contraste", "low contrast", { filter: matte }],
  ["co-matte", "Mate", "matte film", { filter: matte, grain: 0.2, vignette: 0.12 }],
  ["co-ig", "Look instagram", "instagram look", { filter: "saturate(1.2) contrast(1.05) sepia(0.15) brightness(1.04)", vignette: 0.18 }],
  ["co-nv", "Visión nocturna", "night vision", { filter: "grayscale(1) sepia(1) hue-rotate(70deg) saturate(3) brightness(1.15) contrast(1.2)", scan: 0.4, grain: 0.3 }],
  ["co-ir", "Infrarrojo", "infrared", { filter: "grayscale(1) sepia(1) hue-rotate(-30deg) saturate(4) contrast(1.15)" }],
  ["co-comic", "Cómic", "comic style", { filter: comic, halftone: 0.85, edge: 0.4 }],
  ["co-cartoon", "Caricatura", "cartoon filter", { filter: "contrast(1.45) saturate(1.7) brightness(1.05)", edge: 0.7, blur: 0.4 }],
]);

add("Premium", [
  ["pr-impact", "Impacto anime", "anime impact", { lines: 1.1, shock: 1, flash: 0.6, shake: 0.45, zoomBase: 1.1 }],
  ["pr-lines", "Líneas de velocidad", "manga speed lines", { lines: 1.2, lineColor: "#111111", zoomBase: 1.06, filter: "contrast(1.2)" }],
  ["pr-3d", "Zoom 3D", "capcut 3d zoom", { snap: 0.22, zoomSpeed: 5.5, zoomBase: 1.2, blur: 1, vignette: 0.28, whip: 0.25 }],
  ["pr-expand", "Expandir encuadre", "ai expand mirror edges", { zoomBase: 0.86, mirror: "both", vignette: 0.15 }],
  ["pr-bg", "Fondo neón", "ai background stylize neon", { filter: neon, edge: 0.6, bloom: 0.7, vignette: 0.35 }],
  ["pr-skin", "Piel suave", "ai face enhance soft", { blur: 1.4, bloom: 0.8, filter: "contrast(0.96) saturate(1.05) brightness(1.04)" }],
  ["pr-aimb", "Desenfoque de movimiento", "ai motion blur", { whip: 0.9, blur: 4, ghost: 0.4 }],
  ["pr-relight", "Reluz", "ai relight", { leak: "#ffb15a", leak2: "#2446ff", bloom: 0.4 }],
  ["pr-style", "Estilo póster", "ai style transfer poster", { filter: comic, halftone: 0.5, edge: 0.55, hue: 12 }],
  ["key", "Quitar fondo", "green screen keying chroma key", null],
  ["pr-pexpl", "Explosión de partículas", "particle explosion", { sparks: 1.3, bits: 1, shock: 0.8, flash: 0.35 }],
  ["pr-blast", "Estallido", "energy blast", { aura: 1, auraColor: "#9af7ff", shock: 1, flash: 0.45, flashColor: "#dffcff", shake: 0.2 }],
  ["pr-aura", "Aura dorada", "dragon ball aura energy", { aura: 1.2, auraColor: "#ffd84a", bloom: 0.6, flicker: 0.12 }],
  ["pr-eye", "Iris carmesí", "sharingan eye", { vignette: 0.55, leak: "#ff1f3d", filter: "contrast(1.2) saturate(1.15)", shock: 0.4, shockColor: "#ff3355" }],
  ["pr-teleport", "Teletransporte", "teleport", { glitch: 0.8, rgb: 1, flash: 0.5, flashColor: "#b9fff8", pixel: 1.3 }],
  ["pr-speed", "Supervelocidad", "super speed", { lines: 1, whip: 1, blur: 2, zoomBase: 1.08 }],
  ["pr-stop", "Tiempo detenido", "time stop", { filter: "saturate(0.35) contrast(1.2) brightness(0.95)", vignette: 0.45, ghost: 0.3, scan: 0.15 }],
  ["pr-letter", "Letterbox cine", "cinematic letterbox", { letterbox: 0.16, vignette: 0.3, filter: cine, grain: 0.12 }],
  ["pr-parallax", "Paralaje", "3d parallax", { split: 0.4, drift: 0.35, zoomBase: 1.08, rgb: 0.15 }],
  ["pr-hdrz", "Zoom HDR cine", "hdr cinematic zoom", { zoom: 0.1, zoomSpeed: 1.3, zoomBase: 1.12, filter: "contrast(1.3) saturate(1.25)", bloom: 0.4, vignette: 0.3 }],
]);

add("Anime", [
  ["an-blue", "Aura azul", "aura blue energy", { aura: 1.1, auraColor: "#3ecbff", bloom: 0.45 }],
  ["an-red", "Aura roja", "aura red", { aura: 1.1, auraColor: "#ff2d3a", bloom: 0.4, flicker: 0.1 }],
  ["an-green", "Aura verde", "aura green", { aura: 1, auraColor: "#3dff8a" }],
  ["an-violet", "Aura violeta", "aura purple", { aura: 1.1, auraColor: "#b06bff", bloom: 0.35 }],
  ["an-white", "Aura blanca", "aura white", { aura: 1, auraColor: "#f3f3f5", bloom: 0.7, flash: 0.12 }],
  ["an-lred", "Líneas rojas", "speed lines red", { lines: 1, lineColor: "#ff3344", zoomBase: 1.05 }],
  ["an-lwhite", "Líneas blancas", "speed lines white", { lines: 1.15, lineColor: "#f7f7f8" }],
  ["an-lcyan", "Líneas cian", "speed lines cyan", { lines: 1, lineColor: "#00d4c8" }],
  ["an-frame", "Marco de impacto", "impact frame", { flash: 0.75, flashColor: "#f3f3f5", lines: 0.7, shake: 0.5, filter: "contrast(1.4)" }],
  ["an-ink", "Tinta de pantalla", "ink screen", { ink: 0.8, filter: noir, halftone: 0.3 }],
  ["an-punch", "Golpe", "punch hit", { shake: 0.8, flash: 0.4, shock: 0.9, zoomBase: 1.08, lines: 0.4 }],
  ["an-ki", "Destello de ki", "ki blast", { aura: 0.8, auraColor: "#8af7ff", shock: 1, sparks: 0.8, flash: 0.3, flashColor: "#d8fbff" }],
  ["an-cut", "Corte anime", "anime cut", { whip: 0.6, lines: 0.8, flash: 0.25, glitch: 0.15 }],
  ["an-iris", "Ojo activado", "eye activate", { shock: 0.7, shockColor: "#ff2a3c", vignette: 0.4, leak: "#ff2a3c", zoomBase: 1.12 }],
  ["an-blink", "Parpadeo de poder", "power flicker", { flicker: 0.7, aura: 0.5, auraColor: "#ffe14a", filter: vivid }],
  ["an-burst", "Ráfaga", "speed burst", { lines: 1, whip: 0.8, blur: 1.5, zoomBase: 1.1 }],
  ["an-shock", "Onda de choque", "shockwave", { shock: 1.2, shake: 0.25, flash: 0.2 }],
  ["an-dialog", "Zoom de diálogo", "dialogue zoom", { snap: 0.16, zoomSpeed: 6, zoomBase: 1.14, lines: 0.25 }],
  ["an-bg", "Fondo de velocidad", "speed background", { lines: 1.2, lineColor: "#0c0c0e", filter: "contrast(1.15) saturate(0.9)" }],
  ["an-half", "Semitono manga", "manga halftone", { halftone: 1, filter: "grayscale(0.3) contrast(1.35)" }],
  ["an-stroke", "Trazos", "ink strokes edge", { edge: 1.1, filter: comic }],
  ["an-zap", "Chispa de choque", "shock sparks", { sparks: 1.2, bolt: 0.6, flicker: 0.2 }],
  ["an-power", "Resplandor de poder", "power glow", { aura: 1, auraColor: "#ffd24a", bloom: 0.8, lines: 0.3, lineColor: "#ffe9a3" }],
  ["an-dust", "Polvo de impacto", "impact dust", { dust: 1, shake: 0.45, flash: 0.2, fog: 0.25 }],
]);

add("Cámara", [
  ["cam-dutch", "Ángulo holandés", "dutch angle", { spin: 0.18, spinSpeed: 0.35, zoomBase: 1.14 }],
  ["cam-roll", "Rolido", "camera roll", { spin: 0.28, spinSpeed: 0.6, zoomBase: 1.16 }],
  ["cam-crane", "Grúa arriba", "crane up", { bounce: 0.55, zoom: 0.05, zoomSpeed: 0.6, zoomBase: 1.06 }],
  ["cam-ped", "Pedestal", "pedestal", { vshake: 0.15, bounce: 0.45, zoomBase: 1.04 }],
  ["cam-truck-l", "Travelling izquierda", "truck left", { pan: -0.85, panSpeed: 0.6, zoomBase: 1.1 }],
  ["cam-truck-r", "Travelling derecha", "truck right", { pan: 0.85, panSpeed: 0.6, zoomBase: 1.1 }],
  ["cam-hand-s", "Mano suave", "soft handheld", { shake: 0.18, drift: 0.22, spin: 0.02 }],
  ["cam-hand-h", "Mano nerviosa", "hard handheld", { shake: 0.7, spin: 0.05, spinSpeed: 3.4, grain: 0.15 }],
  ["cam-snap-in", "Snap de entrada", "snap in", { snap: 0.32, zoomSpeed: 6, zoomBase: 1.04 }],
  ["cam-snap-out", "Snap de salida", "snap out", { zoomBase: 0.9, snap: 0.08, zoomSpeed: 5, blur: 0.6 }],
  ["cam-whip-l", "Látigo izquierda", "whip left", { whip: 1.1, pan: -1, panSpeed: 2.5, blur: 1.6 }],
  ["cam-whip-r", "Látigo derecha", "whip right", { whip: 1.1, pan: 1, panSpeed: 2.5, blur: 1.6 }],
  ["cam-vertigo", "Vértigo", "vertigo dolly", { zoom: 0.16, zoomSpeed: 0.7, stretch: 0.2, blur: 1.2, zoomBase: 1.15 }],
  ["cam-micro", "Micro jitter", "micro jitter", { shake: 0.22, zoom: 0.015, zoomSpeed: 18 }],
  ["cam-breath", "Respiración", "breathing camera", { zoom: 0.035, zoomSpeed: 1.15, zoomBase: 1.04 }],
  ["cam-push", "Acercamiento lento", "slow push in", { zoom: 0.06, zoomSpeed: 0.45, zoomBase: 1.12 }],
  ["cam-pull", "Alejamiento", "pull out", { zoomBase: 0.9, zoom: 0.04, zoomSpeed: 0.5, vignette: 0.15 }],
  ["cam-orbit", "Órbita lenta", "slow orbit", { spin: 0.1, spinSpeed: 0.55, zoomBase: 1.12, drift: 0.15 }],
  ["cam-tilt-u", "Tilt arriba", "tilt up", { bounce: 0.45, zoomBase: 1.08, spin: 0.03 }],
  ["cam-tilt-d", "Tilt abajo", "tilt down", { bounce: -0.55, zoomBase: 1.06 }],
  ["cam-pano", "Panorámica", "panorama pan", { pan: 1, panSpeed: 0.4, zoomBase: 1.14 }],
  ["cam-hit", "Golpe de zoom", "zoom punch", { snap: 0.36, zoomSpeed: 9, shake: 0.3, flash: 0.25 }],
  ["cam-bass", "Bajo que sacude", "bass shake camera", { vshake: 1, shake: 0.2, zoomSpeed: 7.2, zoom: 0.03 }],
  ["cam-float", "Flotando", "floating", { drift: 0.8, bounce: 0.3, zoom: 0.02, zoomSpeed: 0.5 }],
]);

add("Ambiente", [
  ["am-drizzle", "Llovizna", "drizzle rain", { rain: 0.45, filter: "brightness(0.96) saturate(0.85)" }],
  ["am-pour", "Aguacero", "heavy rain", { rain: 1.5, fog: 0.25, filter: night }],
  ["am-snow", "Nevada", "snowfall", { snow: 1.3, filter: "brightness(1.08) saturate(0.8)" }],
  ["am-ash", "Ceniza", "ash", { dust: 1, bits: 0.5, bitColor: "#c8c4be", filter: "saturate(0.6) contrast(1.05)" }],
  ["am-ember", "Brasas", "embers", { ember: 1.3, leak: "#ff6a22", filter: "saturate(1.1)" }],
  ["am-dust", "Polvo en el aire", "air dust", { dust: 1.3, bloom: 0.2 }],
  ["am-fog", "Niebla baja", "low fog", { fog: 1, filter: "contrast(0.92) saturate(0.75)" }],
  ["am-mist", "Bruma", "mist haze", { fog: 0.7, bloom: 0.45, filter: dream }],
  ["am-petal", "Pétalos", "petals", { bits: 1.1, bitColor: "#ffb3c7" }],
  ["am-confetti", "Confeti", "confetti", { bits: 1.3, bitColor: "#00d4c8" }],
  ["am-bubbles", "Burbujas", "bubbles", { bits: 0.8, bitColor: "rgba(180,230,255,0.9)", bloom: 0.3 }],
  ["am-firefly", "Luciérnagas", "fireflies", { sparks: 0.4, bits: 0.6, bitColor: "#d6ff6b", filter: night }],
  ["am-stage", "Chispas de escenario", "stage sparks", { sparks: 1, ember: 0.4, leak: "#ff4fa3", filter: "contrast(1.1) saturate(1.2)" }],
  ["am-drops", "Gotas en lente", "lens droplets rain", { rain: 0.35, blur: 0.8, bloom: 0.25, fish: 0.08 }],
  ["am-breath", "Vaho", "breath fog", { fog: 0.55, bloom: 0.35, filter: "brightness(1.04) saturate(0.9)" }],
  ["am-sand", "Arena", "sand wind", { dust: 1.2, heat: 0.35, filter: warm }],
  ["am-pollen", "Polen", "pollen", { dust: 0.7, bits: 0.45, bitColor: "#f6e27a" }],
  ["am-storm", "Rayo de tormenta", "storm lightning", { bolt: 1, rain: 0.8, flicker: 0.25, filter: night }],
  ["am-smoke", "Humo lento", "slow smoke", { fog: 0.9, drift: 0.2, filter: "saturate(0.7)" }],
  ["am-neonbits", "Neón flotante", "floating neon", { bits: 0.9, bitColor: "#00d4c8", bloom: 0.4, filter: night }],
]);

add("Óptica", [
  ["op-ana", "Flare anamórfico", "anamorphic flare", { leak: "#9adfff", leak2: "#fff6d8", bloom: 0.8, letterbox: 0.06 }],
  ["op-halation", "Halación", "halation", { bloom: 1.2, leak: "#ff6b6b", filter: "contrast(1.05) saturate(1.1)" }],
  ["op-bloom-s", "Bloom suave", "soft bloom", { bloom: 0.7 }],
  ["op-bloom-h", "Bloom duro", "hard bloom", { bloom: 1.5, filter: "contrast(1.15) brightness(1.04)" }],
  ["op-bokeh", "Círculos bokeh", "bokeh circles", { blur: 3, bloom: 1.2, vignette: 0.2 }],
  ["op-vig", "Viñeta de lente", "lens vignette", { vignette: 0.7 }],
  ["op-barrel", "Barril", "barrel distortion", { fish: 0.55, zoomBase: 1.06 }],
  ["op-fish", "Ojo de pez óptico", "fisheye", { fish: 1, vignette: 0.4, zoomBase: 1.12 }],
  ["op-ca-s", "Aberración suave", "soft chromatic aberration", { rgb: 0.55 }],
  ["op-ca-h", "Aberración fuerte", "heavy chromatic aberration", { rgb: 1.6, prism: 0.4 }],
  ["op-sun", "Sol", "sun flare", { leak: "#ffe29a", bloom: 1, filter: "brightness(1.04)" }],
  ["op-amber", "Fuga ámbar", "amber light leak", { leak: "#ffb15a", grain: 0.2, filter: warm }],
  ["op-pink", "Fuga rosa", "magenta light leak", { leak: "#ff4fa3", leak2: "#ffd0e8", grain: 0.15 }],
  ["op-cyan", "Fuga cian", "cyan light leak", { leak: "#00d4c8", bloom: 0.35 }],
  ["op-prism", "Prisma óptico", "optical prism", { prism: 1.2, bloom: 0.3 }],
  ["op-rays", "Rayos", "light rays optical", { lines: 0.45, lineColor: "#ffe7c2", leak: "#ffe7c2", bloom: 0.4 }],
  ["op-radial", "Radial", "radial blur", { zoomBase: 1.18, blur: 5, vignette: 0.25 }],
  ["op-tilt", "Tilt shift", "tilt shift miniature", { tilt: 1, filter: vivid, vignette: 0.15 }],
  ["op-reflect", "Reflejo de lente", "lens reflection", { ghost: 0.45, leak: "#d7ecff", rgb: 0.25 }],
  ["op-kaleido", "Caleidoscopio", "kaleidoscope", { kaleido: 1, hue: 20, zoomBase: 1.05 }],
]);

add("Utilidad", [
  ["ut-235", "Cinemascope", "letterbox 2.35", { letterbox: 0.12, vignette: 0.15 }],
  ["ut-239", "Barras 2.39", "letterbox 2.39", { letterbox: 0.16 }],
  ["ut-43", "Marco 4:3", "4:3 pillar soft", { vignette: 0.35, filter: "contrast(1.04)", gate: 0.02 }],
  ["ut-polaroid", "Polaroid", "polaroid frame", { frame: 1, filter: "sepia(0.25) contrast(0.98) brightness(1.04)", grain: 0.2 }],
  ["ut-rec", "Grabando", "rec blink", { rec: 1 }],
  ["ut-vig-s", "Viñeta suave", "soft vignette", { vignette: 0.35 }],
  ["ut-vig-h", "Viñeta dura", "hard vignette", { vignette: 0.8 }],
  ["ut-white", "A blanco", "fade white", { flash: 0.55, flashSpeed: 2.2, bloom: 0.3 }],
  ["ut-black", "A negro", "fade black", { black: 0.65, vignette: 0.3 }],
  ["ut-dirty", "Esquinas sucias", "dirty corners", { vignette: 0.6, grain: 0.35, leak: "#6b5344" }],
  ["ut-gate", "Perforaciones", "film gate perfs", { gate: 1, grain: 0.25, filter: "contrast(1.04)" }],
  ["ut-brand", "Flash de marca", "brand flash cyan", { flash: 0.7, flashColor: "#00d4c8", flashSpeed: 5 }],
  ["ut-thin", "Marco fino", "thin frame", { frame: 0.45 }],
  ["ut-oval", "Máscara oval", "oval mask", { vignette: 0.95, zoomBase: 1.05 }],
  ["ut-top", "Sombra superior", "top fade", { letterbox: 0.06, filter: "brightness(0.98)" }],
  ["ut-stamp", "Sello de luz", "light stamp", { leak: "#fff6df", bloom: 0.6, vignette: 0.2 }],
]);

add("Ritmo", [
  ["ry-down", "Golpe en el uno", "downbeat hit", { snap: 0.2, zoomSpeed: 7, shake: 0.28, flash: 0.28 }],
  ["ry-kick", "Zoom de bombo", "kick zoom", { snap: 0.3, zoomSpeed: 7.5, vshake: 0.25 }],
  ["ry-snare", "Flash de caja", "snare flash", { flash: 0.7, flashSpeed: 7.2, shake: 0.12 }],
  ["ry-rgb", "RGB al beat", "rgb on beat", { rgb: 0.9, snap: 0.1, zoomSpeed: 7.4, glitch: 0.2 }],
  ["ry-shake", "Temblor al beat", "shake on beat", { shake: 0.35, snap: 0.12, zoomSpeed: 7 }],
  ["ry-bass", "Pulso de bajo", "bass pulse", { vshake: 0.7, zoom: 0.04, zoomSpeed: 7.2, bloom: 0.2 }],
  ["ry-cut", "Corte al beat", "beat cut glitch", { glitch: 0.45, flash: 0.2, zoomSpeed: 8, snap: 0.08 }],
  ["ry-glow", "Glow al beat", "beat glow", { bloom: 0.5, flash: 0.25, flashColor: "#fff4dd", snap: 0.08, zoomSpeed: 7 }],
  ["ry-strobe", "Estrobo musical", "music strobe", { strobe: 0.85, shake: 0.1 }],
  ["ry-out", "Zoom inverso al beat", "beat zoom out", { zoomBase: 1.2, snap: 0.06, zoomSpeed: 6.5, blur: 0.4 }],
  ["ry-dry", "Impacto seco", "dry impact", { shake: 0.9, flash: 0.4, lines: 0.3 }],
  ["ry-bounce", "Rebote al beat", "beat bounce", { bounce: 0.8, snap: 0.1, zoomSpeed: 7.5 }],
  ["ry-leak", "Fuga al beat", "beat light leak", { leak: "#ffb15a", flash: 0.2, flashSpeed: 7 }],
  ["ry-glitch", "Glitch al beat", "beat glitch", { glitch: 0.7, rgb: 0.4, snap: 0.08, zoomSpeed: 8 }],
  ["ry-letter", "Letterbox al beat", "beat letterbox", { letterbox: 0.1, snap: 0.1, zoomSpeed: 7, filter: cine }],
  ["ry-aura", "Aura al beat", "beat aura", { aura: 0.8, auraColor: "#00d4c8", snap: 0.1, zoomSpeed: 7.2 }],
]);

add("Clásico", [
  ["none", "Sin efecto", "none off", null],
  ["pixel", "Pixel", "pixel mosaic", null],
  ["slices", "Rebanadas", "slices", null],
  ["negative", "Negativo", "negative invert", null],
  ["halftone", "Semitono", "halftone", null],
  ["tiles", "Mosaico", "tiles", null],
  ["zoom", "Zoom clásico", "classic zoom pulse", null],
  ["dizzy", "Mareo", "dizzy", null],
  ["sharpen", "Nitidez", "sharpen", null],
  ["mutation", "Mutación", "mutation glitch burst", null],
  ["oldcam", "Cámara vieja", "old camera 16mm", null],
]);

export function recipeOf(id: string): FxRecipe | undefined {
  if (LEGACY_FX.has(id)) return undefined;
  return recipes.get(id);
}

export const FX_EFFECTS: FxItem[] = items;

export const FX_COUNT = FX_EFFECTS.filter((item) => item.id !== "none").length;

if (FX_COUNT < 300) throw new Error(`Catálogo corto: ${FX_COUNT}`);
