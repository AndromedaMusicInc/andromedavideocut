import { REEL_TEMPLATES } from "@/lib/editor/templates";
import { useEditor } from "@/lib/editor/store";
import { transcribeTimeline } from "@/lib/editor/transcribe";
import type { LyricStyle } from "@/lib/editor/reel";
import { cn } from "@/lib/cn";
import { useState } from "react";

const STYLES: { id: LyricStyle; label: string }[] = [
  { id: "pie", label: "Abajo" },
  { id: "centro", label: "Centro" },
  { id: "karaoke", label: "Karaoke" },
  { id: "hook", label: "Hook" },
];

export function ReelPane() {
  const bpm = useEditor((s) => s.bpm);
  const beats = useEditor((s) => s.beats);
  const analyzeBeat = useEditor((s) => s.analyzeBeat);
  const cutBeats = useEditor((s) => s.cutBeats);
  const dropLyrics = useEditor((s) => s.dropLyrics);
  const applyTemplate = useEditor((s) => s.applyTemplate);
  const applyVega = useEditor((s) => s.applyVega);
  const buildReel = useEditor((s) => s.buildReel);
  const setBpm = useEditor((s) => s.setBpm);
  const [lyrics, setLyrics] = useState("");
  const [plan, setPlan] = useState("");
  const [style, setStyle] = useState<LyricStyle>("pie");
  const [note, setNote] = useState("Audio + letra. Un toque arma el reel.");
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(bpm ? String(bpm) : "100");

  async function run(task: () => Promise<string> | string) {
    setBusy(true);
    try {
      setNote(await task());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-fg">Modo Tempo</h2>
        <p className="mt-1 text-sm text-pretty text-muted">
          Detecta el ritmo y corta el video en tiempo. Cada beat, cada 2 o en el drop.
        </p>
        {bpm ? <p className="mt-1 text-sm font-medium text-accent">{bpm} BPM · {beats.length} beats</p> : null}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void run(() => analyzeBeat())}
        className="h-11 rounded-md bg-accent text-sm font-semibold text-accent-ink disabled:opacity-60"
      >
        Detectar tempo
      </button>
      <label className="flex items-center gap-2 text-xs text-muted">
        BPM a mano
        <input
          value={manual}
          onChange={(event) => setManual(event.target.value)}
          inputMode="numeric"
          className="h-11 w-20 rounded-md border border-line bg-sunken px-2 text-sm text-fg"
        />
        <button
          type="button"
          onClick={() => setNote(setBpm(Number(manual)))}
          className="h-11 flex-1 rounded-md bg-raised text-sm text-fg"
        >
          Usar
        </button>
      </label>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => setNote(cutBeats(1, false))} className="h-11 rounded-md bg-raised text-sm text-fg">
          Cada beat
        </button>
        <button type="button" onClick={() => setNote(cutBeats(2, false))} className="h-11 rounded-md bg-raised text-sm text-fg">
          Cada 2
        </button>
        <button type="button" onClick={() => setNote(cutBeats(4, true))} className="h-11 rounded-md bg-raised text-sm text-fg">
          Drop ×4
        </button>
      </div>
      <p className="text-sm text-pretty text-muted">{note}</p>
      <div>
        <h2 className="text-sm font-semibold text-fg">Reel</h2>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void run(() => buildReel(lyrics, style))}
        className="h-11 rounded-md bg-raised text-sm font-semibold text-fg disabled:opacity-60"
      >
        Armar reel
      </button>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Letra
        <textarea
          value={lyrics}
          onChange={(event) => setLyrics(event.target.value)}
          rows={5}
          placeholder={"Una frase por línea\n0:01.2 0:03.0 con tiempo si ya lo tienes"}
          className="resize-none rounded-md border border-line bg-sunken px-3 py-2 text-sm text-fg"
        />
      </label>
      <div className="grid grid-cols-4 gap-1">
        {STYLES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setStyle(item.id)}
            className={cn(
              "h-11 rounded-md text-xs font-medium",
              style === item.id ? "bg-accent text-accent-ink" : "bg-raised text-muted",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => setNote(dropLyrics(lyrics, style, 2))} className="h-11 rounded-md bg-raised text-sm text-fg">
        Poner letras
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          void run(async () => {
            const result = await transcribeTimeline();
            if (result.lyrics) setLyrics(result.lyrics);
            if (result.lines.length) useEditor.getState().placeLines(result.lines, style);
            return result.note;
          })
        }
        className="h-11 rounded-md bg-raised text-sm text-fg disabled:opacity-60"
      >
        Transcribir voz
      </button>
      <p className="text-xs text-muted">Lee hasta 90 segundos de tu canción y pone la letra en el beat. También puedes pegar un SRT.</p>
      <div>
        <h3 className="text-sm font-semibold text-fg">Plantillas</h3>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {REEL_TEMPLATES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setNote(applyTemplate(item.id, lyrics))}
              className="rounded-md border border-line bg-sunken px-2 py-2 text-left hover:border-accent"
            >
              <span className="block text-sm font-medium text-fg">{item.name}</span>
              <span className="mt-0.5 block text-xs text-muted">{item.hint}</span>
            </button>
          ))}
        </div>
      </div>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Plan de Vega
        <textarea
          value={plan}
          onChange={(event) => setPlan(event.target.value)}
          rows={4}
          placeholder='{"style":"pie","every":2,"lyrics":["frase uno","frase dos"]}'
          className="resize-none rounded-md border border-line bg-sunken px-3 py-2 font-mono text-xs text-fg"
        />
      </label>
      <button type="button" onClick={() => setNote(applyVega(plan))} className="h-11 rounded-md bg-raised text-sm text-fg">
        Aplicar plan
      </button>
    </div>
  );
}
