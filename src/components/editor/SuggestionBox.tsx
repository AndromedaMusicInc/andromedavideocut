// Buzón de sugerencias (Ayuda y botón en Inicio). Enviar = abre el correo; alterno = issue en GitHub.
import { useEffect, useState } from "react";
import { create } from "zustand";
import { X } from "lucide-react";
import { describePlatform, FEEDBACK_EMAIL, FEEDBACK_KINDS, githubIssueUrl, mailtoUrl, validEmail, type Feedback, type FeedbackKind } from "@/lib/feedback";
import { APP_VERSION } from "@/lib/version";

export const useFeedback = create<{ open: boolean; show: () => void; hide: () => void }>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}));

type Desk = { openExternal?: (u: string) => Promise<void>; onMenu?: (name: string, fn: () => void) => () => void };
const desk = () => (typeof window !== "undefined" ? (window as unknown as { avcDesktop?: Desk }).avcDesktop : undefined);

export function openLink(url: string) {
  const spy = (window as unknown as { __avcOpenLinkSpy?: (u: string) => void }).__avcOpenLinkSpy;
  if (spy) return spy(url); // solo pruebas
  const d = desk();
  if (d?.openExternal) return void d.openExternal(url); // PC: shell.openExternal
  if (url.startsWith("mailto:")) window.location.href = url;
  else window.open(url, "_blank", "noopener");
}

export function SuggestionBox() {
  const open = useFeedback((s) => s.open);
  const hide = useFeedback((s) => s.hide);
  const [kind, setKind] = useState<FeedbackKind>("sugerencia");
  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  useEffect(() => {
    const d = desk();
    return d?.onMenu?.("feedback", () => useFeedback.getState().show());
  }, []);
  useEffect(() => { if (open) setSent(null); }, [open]);
  if (!open) return null;
  const platform = describePlatform(navigator.userAgent, Boolean(desk()));
  const fb: Feedback = { kind, text, email, version: APP_VERSION, platform };
  const ok = text.trim().length >= 3 && validEmail(email);
  const go = (url: string, what: string) => { if (!ok) return; openLink(url); setSent(what); };
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4" onKeyDown={(e) => { if (e.key === "Escape") hide(); e.stopPropagation(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="fb-title" data-feedback="" className="w-full max-w-md rounded-lg border border-[#23232F] bg-[#11111A] p-5 text-white">
        <div className="flex items-center justify-between">
          <h2 id="fb-title" className="text-base font-semibold">Buzón de sugerencias</h2>
          <button type="button" aria-label="Cerrar" onClick={hide} className="grid size-9 place-items-center rounded-md hover:bg-[#1B1B27]"><X className="size-4" /></button>
        </div>
        <p className="mt-1 text-xs text-[#8A8A9A]">Llega al equipo de Andromeda ({FEEDBACK_EMAIL}). Se abre tu app de correo con todo listo; tú decides si lo envías.</p>
        <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Tipo">
          {FEEDBACK_KINDS.map((k) => (
            <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} data-fb-kind={k.id} onClick={() => setKind(k.id)}
              className={`h-9 flex-1 rounded-md border text-sm ${kind === k.id ? "border-[#D4AF37] bg-[#D4AF37]/15" : "border-[#23232F] text-[#C9C9D4]"}`}>{k.label}</button>
          ))}
        </div>
        <label className="mt-3 block text-sm">Cuéntanos
          <textarea data-fb-text="" value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={6000}
            placeholder={kind === "bug" ? "¿Qué pasó? ¿Qué esperabas? Pasos para repetirlo…" : "Tu idea o comentario…"}
            className="mt-1 w-full rounded-md border border-[#23232F] bg-[#0B0B12] p-2 text-sm outline-none focus:border-[#D4AF37]" />
        </label>
        <label className="mt-2 block text-sm">Tu correo (opcional, para responderte)
          <input data-fb-email="" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com"
            className="mt-1 h-9 w-full rounded-md border border-[#23232F] bg-[#0B0B12] px-2 text-sm outline-none focus:border-[#D4AF37]" />
        </label>
        {!validEmail(email) ? <p className="mt-1 text-xs text-red-400">Ese correo no parece válido.</p> : null}
        <p data-fb-meta="" className="mt-2 text-xs text-[#8A8A9A]">Se adjunta: versión {APP_VERSION} · {platform}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" data-fb-send="" disabled={!ok} onClick={() => go(mailtoUrl(fb), "correo")}
            className="h-10 flex-1 rounded-md bg-[#D4AF37] px-3 text-sm font-semibold text-black disabled:opacity-40">Enviar</button>
          <button type="button" data-fb-github="" disabled={!ok} onClick={() => go(githubIssueUrl(fb), "GitHub")}
            className="h-10 rounded-md border border-[#23232F] px-3 text-sm disabled:opacity-40">Abrir en GitHub</button>
        </div>
        {sent ? <p role="status" className="mt-2 text-xs text-[#C9C9D4]">{sent === "correo" ? "Abrimos tu correo con el mensaje listo. ¡Gracias!" : "Abrimos GitHub con el reporte listo (necesitas tu cuenta de GitHub para enviarlo)."}</p> : null}
      </div>
    </div>
  );
}

/** Menú "Ayuda" del editor (web y PC): buzón de sugerencias y atajos. */
export function HelpMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button type="button" data-help-menu="" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} title="Ayuda"
        className="h-11 rounded-md border border-line bg-raised px-3 text-sm text-fg hover:bg-surface">Ayuda</button>
      {open ? (
        <div role="menu" className="absolute right-0 top-12 z-50 w-56 rounded-md border border-line bg-raised p-1 shadow-lg" onMouseLeave={() => setOpen(false)}>
          <button type="button" role="menuitem" data-help-feedback="" onClick={() => { setOpen(false); useFeedback.getState().show(); }} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-surface">Buzón de sugerencias…</button>
          <button type="button" role="menuitem" data-help-shortcuts="" onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent("avc:shortcuts")); }} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-surface">Atajos de teclado <span className="float-right text-muted">?</span></button>
          <button type="button" role="menuitem" data-help-versions="" onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent("avc:versions")); }} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-surface">Historial de versiones…</button>
        </div>
      ) : null}
    </div>
  );
}
