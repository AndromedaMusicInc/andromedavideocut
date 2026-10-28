// Buzón de sugerencias: sin backend, sin cuentas, sin tokens. Arma un mailto: a info@.
export const FEEDBACK_EMAIL = "info@andromedamusicinc.com";
export type FeedbackKind = "sugerencia" | "bug" | "otro";
export const FEEDBACK_KINDS: { id: FeedbackKind; label: string }[] = [
  { id: "sugerencia", label: "Sugerencia" },
  { id: "bug", label: "Bug / error" },
  { id: "otro", label: "Otro" },
];
export interface Feedback { kind: FeedbackKind; text: string; email?: string; version: string; platform: string }

const KIND_LABEL: Record<FeedbackKind, string> = { sugerencia: "Sugerencia", bug: "Bug", otro: "Otro" };
const MAX_URL_TEXT = 6000; // mailto falla con URLs muy largas

export function feedbackSubject(f: Pick<Feedback, "kind" | "version">) {
  return `[AndromedaVideoCut ${f.version}] ${KIND_LABEL[f.kind]}`;
}

export function feedbackBody(f: Feedback) {
  const text = f.text.trim().slice(0, MAX_URL_TEXT);
  const email = (f.email || "").trim();
  return [
    text,
    "",
    "—",
    `Tipo: ${KIND_LABEL[f.kind]}`,
    `Versión: ${f.version}`,
    `Plataforma: ${f.platform}`,
    email ? `Contacto: ${email}` : "Contacto: (no indicado)",
  ].join("\n");
}

export function validEmail(email: string) {
  const e = email.trim();
  return e === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export function mailtoUrl(f: Feedback) {
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(feedbackSubject(f))}&body=${encodeURIComponent(feedbackBody(f))}`;
}

/** "PC (Windows)" / "Web (Chrome · Linux)" a partir del userAgent. */
export function describePlatform(ua: string, desktop: boolean) {
  const os = /Windows/i.test(ua) ? "Windows" : /Mac OS X|Macintosh/i.test(ua) ? "macOS" : /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS" : /Linux/i.test(ua) ? "Linux" : "otro";
  if (desktop) return `PC (${os})`;
  const br = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "navegador";
  return `Web (${br} · ${os})`;
}
