import { ingestFile } from "@/lib/editor/import-media";
import { seek } from "@/lib/editor/engine";
const STATIC_BUILD = !import.meta.env.VITE_API_BASE;
import { getGrokKey, hasGrokKey, setGrokKey } from "@/lib/editor/grok-key";
import { STUDIO_PACKS } from "@/lib/editor/packs";
import { useEditor } from "@/lib/editor/store";
import { useState } from "react";

const IDEAS = [
  "Estudio de noche, luces cian, micrófono y humo, plano lento",
  "Calle mojada de noche, neón morado, un auto pasa despacio",
  "Vinilo girando en primer plano, luces doradas, polvo en el aire",
  "Club oscuro, láser cian, siluetas, sin caras reconocibles",
];

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function GeneratePane() {
  const placePack = useEditor((s) => s.placePack);
  const aspect = useEditor((s) => s.aspect);
  const [phrase, setPhrase] = useState("");
  const [prompt, setPrompt] = useState(IDEAS[0] ?? "");
  const [note, setNote] = useState("Un toque arma 7 segundos. El video tarda cerca de un minuto.");
  const [busy, setBusy] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [hasKey, setHasKey] = useState(hasGrokKey());

  function saveKey() {
    setGrokKey(keyInput);
    setHasKey(hasGrokKey());
    setKeyInput("");
    setNote(hasGrokKey() ? "Clave guardada en este navegador." : "Pega tu clave de Grok para generar.");
  }

  async function generate() {
    if (STATIC_BUILD) {
      setNote("En la versión web (sin servidor) generar video con IA no está disponible todavía.");
      return;
    }
    const key = getGrokKey();
    if (!key) {
      setNote("Pega tu clave de Grok arriba. Después cada persona usará la suya.");
      return;
    }
    setBusy(true);
    setNote("Generando 6 segundos. No cierres esta vista.");
    try {
      const start = await fetch(`${import.meta.env.VITE_API_BASE ?? ""}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-xai-key": key },
        body: JSON.stringify({ prompt, aspect }),
      });
      const started = (await start.json()) as { requestId?: string; error?: string };
      if (!start.ok || !started.requestId) throw new Error(started.error || "No se pudo empezar.");
      const deadline = Date.now() + 180_000;
      while (Date.now() < deadline) {
        await sleep(4000);
        const poll = await fetch(`${import.meta.env.VITE_API_BASE ?? ""}/api/generate?id=${encodeURIComponent(started.requestId)}`, {
          headers: { "x-xai-key": key },
        });
        const body = (await poll.json()) as { status?: string; error?: string };
        if (!poll.ok) throw new Error(body.error || "Falló la generación.");
        if (body.status === "failed" || body.status === "expired") {
          throw new Error(body.error || "No se pudo generar ese clip.");
        }
        if (body.status !== "done") continue;
        const file = await fetch(`${import.meta.env.VITE_API_BASE ?? ""}/api/generate?id=${encodeURIComponent(started.requestId)}&file=1`, {
          headers: { "x-xai-key": key },
        });
        if (!file.ok) throw new Error("El clip se hizo, pero no se pudo bajar.");
        const blob = await file.blob();
        const named = new File([blob], "clip-generado.mp4", { type: "video/mp4" });
        const loaded = await ingestFile(named);
        loaded.asset.name = "Clip generado";
        await useEditor.getState().addAsset(loaded.asset, loaded.blob);
        const placed = useEditor.getState().clips.find((clip) => clip.assetId === loaded.asset.id);
        if (placed) seek(placed.start + 0.2);
        setNote("Clip de 6 s en la línea, sin sonido. Ponle tu canción.");
        return;
      }
      throw new Error("Tardó demasiado. Prueba otra frase.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "No se pudo generar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-fg">Generador de clips</h2>
        <p className="mt-1 text-sm text-pretty text-muted">{note}</p>
      </div>
      <div className="rounded-md border border-line bg-sunken p-2">
        <p className="text-xs text-muted">
          {hasKey ? "Clave de Grok lista en este navegador." : "Pega tu clave de Grok para generar. Después cada persona usará la suya."}
        </p>
        <div className="mt-2 flex gap-2">
          <input
            type="password"
            value={keyInput}
            onChange={(event) => setKeyInput(event.target.value)}
            placeholder={hasKey ? "Cambiar clave" : "xai-..."}
            className="min-w-0 flex-1 rounded-md border border-line bg-raised px-2 py-1.5 text-sm text-fg"
          />
          <button
            type="button"
            onClick={saveKey}
            disabled={!keyInput.trim()}
            className="rounded-md bg-accent px-3 text-xs font-semibold text-accent-ink disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </div>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Frase del clip
        <textarea
          value={phrase}
          onChange={(event) => setPhrase(event.target.value)}
          rows={3}
          placeholder={"Primera línea = título\nLas demás salen abajo"}
          className="resize-none rounded-md border border-line bg-sunken px-3 py-2 text-sm text-fg"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        {STUDIO_PACKS.map((pack) => (
          <button
            key={pack.id}
            type="button"
            disabled={busy}
            onClick={() => setNote(placePack(pack.id, phrase))}
            className="rounded-md border border-line bg-sunken px-2 py-2 text-left hover:border-accent disabled:opacity-60"
          >
            <span className="block text-sm font-medium text-fg">{pack.name}</span>
            <span className="mt-0.5 block text-xs text-muted">{pack.hint}</span>
          </button>
        ))}
      </div>
      <div className="mt-1 border-t border-line pt-3">
        <h3 className="text-sm font-semibold text-fg">Clip de video</h3>
        <p className="mt-1 text-xs text-muted">6 segundos, en el formato del proyecto, sin audio. Una generación por toque.</p>
      </div>
      <div className="flex flex-col gap-1">
        {IDEAS.map((idea) => (
          <button
            key={idea}
            type="button"
            disabled={busy}
            onClick={() => setPrompt(idea)}
            className="rounded-md bg-raised px-2 py-2 text-left text-xs text-muted hover:text-fg disabled:opacity-60"
          >
            {idea}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Qué se ve
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={3}
          className="resize-none rounded-md border border-line bg-sunken px-3 py-2 text-sm text-fg"
        />
      </label>
      <button
        type="button"
        disabled={busy || !hasKey}
        onClick={() => void generate()}
        className="h-11 rounded-md bg-accent text-sm font-semibold text-accent-ink disabled:opacity-60"
      >
        {busy ? "Generando…" : hasKey ? "Generar y poner en la línea" : "Pega tu clave primero"}
      </button>
    </div>
  );
}
