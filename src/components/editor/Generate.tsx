import { ingestFile } from "@/lib/editor/import-media";
import { seek } from "@/lib/editor/engine";
import { AiError, generateVideo, useAi } from "@/lib/ai/xai";
import { AiLock, UsageBar } from "@/components/editor/ConnectGrok";
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
  const hasKey = useAi((s) => s.connected);

  async function generate() {
    setBusy(true);
    setNote("Generando 6 segundos. No cierres esta vista.");
    try {
      const blob = await generateVideo(prompt, aspect, setNote);
      const named = new File([blob], "clip-generado.mp4", { type: "video/mp4" });
      const loaded = await ingestFile(named);
      loaded.asset.name = "Clip generado";
      await useEditor.getState().addAsset(loaded.asset, loaded.blob);
      const placed = useEditor.getState().clips.find((clip) => clip.assetId === loaded.asset.id);
      if (placed) seek(placed.start + 0.2);
      setNote("Clip de 6 s en la línea, sin sonido. Ponle tu canción.");
    } catch (err) {
      setNote(err instanceof AiError ? err.message : "No se pudo generar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <UsageBar />
      <div>
        <h2 className="text-sm font-semibold text-fg">Generador de clips</h2>
        <p className="mt-1 text-sm text-pretty text-muted">{note}</p>
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
      {!hasKey ? <AiLock feature="Generar video con IA" /> : null}
      {hasKey ? (<>
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
        data-ai-feature="generate"
        disabled={busy}
        onClick={() => void generate()}
        className="h-11 rounded-md bg-accent text-sm font-semibold text-accent-ink disabled:opacity-60"
      >
        {busy ? "Generando…" : "Generar y poner en la línea"}
      </button>
      </>) : null}
    </div>
  );
}
