/**
 * IA con la cuenta de Grok del propio usuario ("Iniciar sesión con Grok", OAuth de xAI).
 * - Solo en la app de escritorio: el proceso main hace el OAuth (loopback + PKCE, o código de
 *   dispositivo), guarda los tokens cifrados con safeStorage, los renueva y llama a api.x.ai.
 *   El renderer nunca ve los tokens.
 * - En la web, auth.x.ai no permite CORS desde el navegador, así que la IA queda bloqueada con
 *   "Disponible en la app de escritorio".
 * Andromeda Music Inc no paga ni hace de proxy de IA: cada usuario usa su propia suscripción.
 */
import { create } from "zustand";

export const SUBSCRIBE_URL = "https://x.ai/grok";
export const NO_SUB_MSG =
  "Tu cuenta de Grok no tiene una suscripción activa (SuperGrok, X Premium+ o X Subscription). Suscríbete en x.ai para usar la IA.";
export const DESKTOP_ONLY_MSG = "Disponible en la app de escritorio";

type RawResponse = { status: number; body: string };
type ReqInit = { method: "GET" | "POST"; path: string; json?: unknown; wav?: ArrayBuffer; fields?: Record<string, string> };
export type LoginResult =
  | { ok: true; name: string }
  | { ok: false; kind: "no-subscription" | "denied" | "offline" | "timeout" | "not-configured" | "port-busy" | "cancelled" | "other"; message: string };
export type DeviceStart = { ok: true; userCode: string; verificationUri: string } | { ok: false; message: string };

interface DesktopAi {
  status(): Promise<{ connected: boolean; name?: string; configured: boolean }>;
  login(): Promise<LoginResult>;
  deviceStart(): Promise<DeviceStart>;
  deviceWait(): Promise<LoginResult>;
  cancel(): Promise<void>;
  logout(): Promise<void>;
  request(init: ReqInit): Promise<RawResponse>;
  download(url: string): Promise<{ status: number; data?: ArrayBuffer }>;
}
declare global {
  interface Window {
    avcDesktop?: { ai: DesktopAi; openExternal(url: string): Promise<void>; version: string };
  }
}

export const isDesktop = () => typeof window !== "undefined" && Boolean(window.avcDesktop?.ai);

export function openExternal(url: string) {
  if (window.avcDesktop) void window.avcDesktop.openExternal(url);
  else window.open(url, "_blank", "noopener");
}

export class AiError extends Error {
  constructor(
    message: string,
    public kind: "no-session" | "no-subscription" | "offline" | "rate" | "desktop-only" | "other",
  ) {
    super(message);
  }
}

interface AiState {
  connected: boolean;
  configured: boolean;
  name: string;
  ready: boolean;
  wizard: boolean;
  settings: boolean;
  refresh(): Promise<void>;
  openWizard(): void;
  closeWizard(): void;
  openSettings(): void;
  closeSettings(): void;
}
export const useAi = create<AiState>((set) => ({
  connected: false,
  configured: false,
  name: "",
  ready: false,
  wizard: false,
  settings: false,
  refresh: async () => {
    if (!isDesktop()) {
      set({ connected: false, configured: false, name: "", ready: true });
      return;
    }
    const s = await window.avcDesktop!.ai.status();
    set({ connected: s.connected, configured: s.configured, name: s.name ?? "", ready: true });
  },
  openWizard: () => set({ wizard: true, settings: false }),
  closeWizard: () => set({ wizard: false }),
  openSettings: () => set({ settings: true }),
  closeSettings: () => set({ settings: false }),
}));

function friendly(status: number): AiError {
  if (status === 401 || status === 402 || status === 403) return new AiError(NO_SUB_MSG, "no-subscription");
  if (status === 429) return new AiError("Usaste mucha IA seguida o llegaste al límite de tu plan. Espera un rato y vuelve a intentar.", "rate");
  if (status >= 500) return new AiError("Grok tiene un problema en este momento. Inténtalo más tarde.", "other");
  return new AiError("Grok no aceptó el pedido. Inténtalo otra vez.", "other");
}

async function call(init: ReqInit): Promise<unknown> {
  if (!isDesktop()) throw new AiError(DESKTOP_ONLY_MSG, "desktop-only");
  const raw = await window.avcDesktop!.ai.request(init);
  if (raw.status === -1) throw new AiError("Conecta tu cuenta de xAI/Grok para usar IA.", "no-session");
  if (raw.status === 0) throw new AiError("No hay conexión a internet (o no se pudo llegar a Grok). Revisa tu red y vuelve a intentar.", "offline");
  if (raw.status < 200 || raw.status >= 300) {
    const err = friendly(raw.status);
    if (err.kind === "no-subscription") await useAi.getState().refresh(); // main ya cerró la sesión
    throw err;
  }
  try {
    return JSON.parse(raw.body);
  } catch {
    return {};
  }
}

export async function login(): Promise<LoginResult> {
  if (!isDesktop()) return { ok: false, kind: "other", message: DESKTOP_ONLY_MSG };
  const r = await window.avcDesktop!.ai.login();
  await useAi.getState().refresh();
  return r;
}
export async function deviceStart(): Promise<DeviceStart> {
  if (!isDesktop()) return { ok: false, message: DESKTOP_ONLY_MSG };
  return window.avcDesktop!.ai.deviceStart();
}
export async function deviceWait(): Promise<LoginResult> {
  const r = await window.avcDesktop!.ai.deviceWait();
  await useAi.getState().refresh();
  return r;
}
export async function cancelLogin() {
  if (isDesktop()) await window.avcDesktop!.ai.cancel();
}
export async function logout(): Promise<void> {
  if (isDesktop()) await window.avcDesktop!.ai.logout();
  await useAi.getState().refresh();
}
/** Comprueba que la sesión sigue activa y con suscripción. */
export async function testSession(): Promise<void> {
  await call({ method: "GET", path: "/v1/models" });
}

export async function transcribeWav(wav: ArrayBuffer): Promise<{ text?: string; words?: unknown }> {
  return (await call({
    method: "POST",
    path: "/v1/stt",
    wav,
    fields: { model: "grok-voice-transcribe-2.0", language: "es", format: "true" },
  })) as { text?: string; words?: unknown };
}

const VIDEO_ASPECTS = new Set(["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"]);

export async function generateVideo(prompt: string, aspect: string, onStatus: (s: string) => void): Promise<Blob> {
  const clean = prompt.replace(/\s+/g, " ").trim().slice(0, 400);
  if (clean.length < 8) throw new AiError("Describe el clip en una frase.", "other");
  const started = (await call({
    method: "POST",
    path: "/v1/videos/generations",
    json: {
      model: "grok-imagine-video-1.5-lite",
      prompt: clean,
      duration: 6,
      aspect_ratio: aspect === "4:5" ? "3:4" : VIDEO_ASPECTS.has(aspect) ? aspect : "9:16",
      resolution: "720p",
      generate_audio: false,
    },
  })) as { request_id?: string };
  const id = started.request_id;
  if (!id || !/^[a-zA-Z0-9-]{8,80}$/.test(id)) throw new AiError("Grok no devolvió un pedido válido.", "other");
  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 4000));
    onStatus("Generando… esto tarda cerca de un minuto.");
    const job = (await call({ method: "GET", path: `/v1/videos/${id}` })) as { status?: string; video?: { url?: string } };
    if (job.status === "failed" || job.status === "expired") throw new AiError("No se pudo generar ese clip. Cambia la frase.", "other");
    const url = job.video?.url;
    if (job.status !== "done" || !url) continue;
    const r = await window.avcDesktop!.ai.download(url);
    if (!r.data) throw new AiError("El clip se hizo, pero no se pudo bajar.", "other");
    return new Blob([r.data], { type: "video/mp4" });
  }
  throw new AiError("Tardó demasiado. Prueba otra frase.", "other");
}
