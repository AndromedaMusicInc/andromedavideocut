import {
  DESKTOP_ONLY_MSG,
  NO_SUB_MSG,
  SUBSCRIBE_URL,
  cancelLogin,
  deviceStart,
  deviceWait,
  isDesktop,
  login,
  logout,
  openExternal,
  testSession,
  useAi,
  AiError,
  type LoginResult,
} from "@/lib/ai/xai";
import { cn } from "@/lib/cn";
import { CheckCircle2, ExternalLink, Lock, Monitor, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

export const LOCK_TEXT = "Conecta tu cuenta de xAI/Grok para usar IA";

/** Candado de IA. En escritorio abre "Conectar Grok"; en la web explica que es de la app de escritorio. */
export function AiLock({ feature, className }: { feature: string; className?: string }) {
  const openWizard = useAi((s) => s.openWizard);
  const desktop = isDesktop();
  return (
    <button
      type="button"
      data-ai-lock=""
      onClick={openWizard}
      className={cn("flex w-full items-start gap-2 rounded-md border border-dashed border-line bg-sunken p-3 text-left hover:border-accent", className)}
    >
      <Lock className="mt-0.5 size-4 shrink-0 text-accent" />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-fg">{feature}</span>
        <span className="text-xs text-muted">{LOCK_TEXT}</span>
        <span className="text-xs font-semibold text-accent">{desktop ? "Conectar mi Grok →" : `${DESKTOP_ONLY_MSG} →`}</span>
      </span>
    </button>
  );
}

export function useAiBoot() {
  const refresh = useAi((s) => s.refresh);
  useEffect(() => {
    void refresh();
  }, [refresh]);
}

type Phase =
  | { k: "idle" }
  | { k: "waiting" }
  | { k: "device"; code: string; uri: string }
  | { k: "done"; name: string }
  | { k: "error"; message: string; sub?: boolean };

function Modal({ children, onClose, phase }: { children: React.ReactNode; onClose: () => void; phase: string }) {
  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-bg/80 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="grok-title"
        data-grok-dialog={phase}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg border border-line bg-raised p-5 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="grok-title" className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="size-4 text-accent" /> Conectar Grok
          </h2>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="grid size-9 place-items-center rounded-md hover:bg-surface">
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function ConnectGrokWizard() {
  const open = useAi((s) => s.wizard);
  const close = useAi((s) => s.closeWizard);
  const connected = useAi((s) => s.connected);
  const name = useAi((s) => s.name);
  const configured = useAi((s) => s.configured);
  const [phase, setPhase] = useState<Phase>({ k: "idle" });

  useEffect(() => {
    if (open) setPhase(connected ? { k: "done", name } : { k: "idle" });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;
  const onClose = () => {
    if (phase.k === "waiting" || phase.k === "device") void cancelLogin();
    close();
  };
  const finish = (r: LoginResult) => {
    if (r.ok) setPhase({ k: "done", name: r.name });
    else if (r.kind !== "cancelled") setPhase({ k: "error", message: r.message, sub: r.kind === "no-subscription" });
  };

  if (!isDesktop()) {
    return (
      <Modal onClose={onClose} phase="web">
        <div className="flex flex-col items-center gap-3 text-center text-sm">
          <Monitor className="size-10 text-accent" />
          <p className="text-base font-semibold text-fg">{DESKTOP_ONLY_MSG}</p>
          <p className="text-muted">
            La IA usa tu propia cuenta de Grok, y el inicio de sesión de Grok solo funciona en la app de escritorio de AndromedaVideoCut (Windows). En la web
            puedes editar y exportar todo lo demás sin límites.
          </p>
          <button type="button" onClick={close} className="h-11 w-full rounded-md bg-accent font-semibold text-accent-ink">
            Entendido
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} phase={phase.k}>
      {phase.k === "idle" ? (
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-fg">Usa la IA (letra automática y clips de video) con tu propia cuenta de Grok.</p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-muted">
            <li>Necesitas una suscripción activa: SuperGrok, X Premium+ o X Subscription.</li>
            <li>Se abre tu navegador, inicias sesión en Grok y apruebas el acceso. Listo.</li>
            <li>No guardamos tu contraseña. Andromeda Music Inc no cobra ni paga la IA.</li>
          </ul>
          <button
            type="button"
            data-connect=""
            disabled={!configured}
            onClick={() => {
              setPhase({ k: "waiting" });
              void login().then(finish);
            }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-accent px-4 text-base font-semibold text-accent-ink disabled:opacity-50"
          >
            <Sparkles className="size-5" /> Conectar mi Grok
          </button>
          {!configured ? (
            <p data-not-configured="" className="rounded-md border border-amber-400/40 bg-amber-400/10 p-2 text-xs text-fg">
              El inicio de sesión con Grok todavía no está habilitado en esta versión de la app. Llegará en una actualización.
            </p>
          ) : null}
        </div>
      ) : null}
      {phase.k === "waiting" ? (
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-base font-semibold text-fg">Se abrió tu navegador</p>
          <p className="text-muted">Inicia sesión en Grok y toca <b>Aprobar</b>. Después vuelve aquí; la app se conecta sola.</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-accent" />
          </div>
          <button
            type="button"
            data-use-code=""
            onClick={() => {
              void cancelLogin().then(async () => {
                const d = await deviceStart();
                if (!d.ok) return setPhase({ k: "error", message: d.message });
                setPhase({ k: "device", code: d.userCode, uri: d.verificationUri });
                finish(await deviceWait());
              });
            }}
            className="text-left text-xs text-accent underline"
          >
            ¿No se abrió el navegador o no vuelve? Conéctate con un código
          </button>
        </div>
      ) : null}
      {phase.k === "device" ? (
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-fg">Abre esta página en cualquier navegador e ingresa el código:</p>
          <button type="button" onClick={() => openExternal(phase.uri)} className="inline-flex items-center gap-1 text-accent underline">
            {phase.uri} <ExternalLink className="size-3" />
          </button>
          <p data-user-code="" className="rounded-md bg-sunken py-3 text-center font-mono text-2xl font-bold tracking-widest text-fg">
            {phase.code}
          </p>
          <p className="text-muted">Esperando a que apruebes el acceso…</p>
        </div>
      ) : null}
      {phase.k === "done" ? (
        <div className="flex flex-col items-center gap-3 text-center text-sm">
          <CheckCircle2 className="size-12 text-accent" />
          <p data-connected-as="" className="text-base font-semibold text-fg">
            ¡Conectado como {phase.name || "tu cuenta de Grok"}!
          </p>
          <p className="text-muted">La IA quedó desbloqueada: Transcribir voz y Generar video.</p>
          <button type="button" onClick={close} className="h-11 w-full rounded-md bg-accent font-semibold text-accent-ink">
            Empezar
          </button>
          <button type="button" data-disconnect="" onClick={() => void logout().then(() => setPhase({ k: "idle" }))} className="text-xs text-muted underline hover:text-fg">
            Desconectar
          </button>
        </div>
      ) : null}
      {phase.k === "error" ? (
        <div className="flex flex-col gap-3 text-sm">
          <p role="alert" data-login-error="" className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-fg">
            {phase.message}
          </p>
          {phase.sub ? (
            <button type="button" onClick={() => openExternal(SUBSCRIBE_URL)} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line font-semibold text-fg">
              Ver suscripciones en x.ai <ExternalLink className="size-4" />
            </button>
          ) : null}
          <button type="button" onClick={() => setPhase({ k: "idle" })} className="h-11 rounded-md bg-accent font-semibold text-accent-ink">
            Intentar otra vez
          </button>
        </div>
      ) : null}
    </Modal>
  );
}

/** Ajustes → IA (opcional). */
export function SettingsDialog() {
  const open = useAi((s) => s.settings);
  const close = useAi((s) => s.closeSettings);
  const connected = useAi((s) => s.connected);
  const name = useAi((s) => s.name);
  const openWizard = useAi((s) => s.openWizard);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    if (open) setNote(null);
  }, [open]);
  if (!open) return null;
  const desktop = isDesktop();
  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-bg/80 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="settings-title" data-settings="" className="w-full max-w-md rounded-lg border border-line bg-raised p-5">
        <div className="flex items-center justify-between">
          <h2 id="settings-title" className="text-base font-semibold">Ajustes</h2>
          <button type="button" aria-label="Cerrar" onClick={close} className="grid size-9 place-items-center rounded-md hover:bg-surface">
            <X className="size-4" />
          </button>
        </div>
        <section className="mt-3 rounded-md border border-line bg-sunken p-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Sparkles className="size-4 text-accent" /> IA (opcional)
          </h3>
          <p className="mt-1 text-xs text-muted">
            La IA usa tu propia cuenta de Grok con suscripción (SuperGrok, X Premium+ o X Subscription). Sin conectar, el editor funciona completo; solo la IA
            queda bloqueada. {desktop ? "La sesión se guarda cifrada en este equipo." : `${DESKTOP_ONLY_MSG}.`}
          </p>
          <p data-ai-status="" className="mt-2 text-sm text-fg">
            {!desktop ? `🔒 ${DESKTOP_ONLY_MSG}` : connected ? `✅ Conectado como ${name || "tu cuenta de Grok"}` : "🔒 Sin conectar"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {!connected ? (
              <button type="button" data-open-wizard="" onClick={openWizard} className="h-10 rounded-md bg-accent px-3 text-sm font-semibold text-accent-ink">
                {desktop ? "Conectar mi Grok" : "Más información"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  data-test-connection=""
                  onClick={() =>
                    void testSession().then(
                      () => setNote({ ok: true, text: "Conexión correcta con Grok." }),
                      (e: unknown) => setNote({ ok: false, text: e instanceof AiError ? e.message : NO_SUB_MSG }),
                    )
                  }
                  className="h-10 rounded-md border border-line px-3 text-sm text-fg"
                >
                  Probar conexión
                </button>
                <button
                  type="button"
                  data-disconnect=""
                  onClick={() => void logout().then(() => setNote({ ok: true, text: "Desconectado. La IA quedó bloqueada." }))}
                  className="h-10 rounded-md border border-line px-3 text-sm text-fg"
                >
                  Desconectar
                </button>
              </>
            )}
          </div>
          {note ? (
            <p role="status" className={cn("mt-2 rounded-md p-2 text-xs", note.ok ? "bg-accent/15 text-fg" : "border border-red-500/40 bg-red-500/10 text-fg")}>
              {note.text}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
