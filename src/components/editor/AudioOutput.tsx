import { mixer } from "@/lib/editor/audio";
import { cn } from "@/lib/cn";
import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Device = { id: string; label: string };

/** Lista las salidas de audio (audiooutput). Sin permiso, Chromium oculta los nombres. */
export function useOutputs() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    const md = navigator.mediaDevices;
    if (!md?.enumerateDevices) {
      setSupported(false);
      return;
    }
    const load = () =>
      void md.enumerateDevices().then((list) => {
        const outs = list.filter((d) => d.kind === "audiooutput" && d.deviceId !== "default" && d.deviceId !== "communications");
        setDevices(outs.map((d, i) => ({ id: d.deviceId, label: d.label || `Salida ${i + 1}` })));
      });
    load();
    md.addEventListener?.("devicechange", load);
    return () => md.removeEventListener?.("devicechange", load);
  }, []);
  const ctxProto = typeof AudioContext !== "undefined" ? (AudioContext.prototype as { setSinkId?: unknown }) : {};
  return { devices, supported: supported && typeof ctxProto.setSinkId === "function" };
}

export function OutputSelect({ compact = false }: { compact?: boolean }) {
  const { devices, supported } = useOutputs();
  const [sink, setSink] = useState(mixer.sinkId || (typeof localStorage !== "undefined" ? localStorage.getItem("avc-audio-sink") || "" : ""));
  const [note, setNote] = useState("");
  if (!supported) return compact ? null : <p className="text-xs text-muted">Este navegador no permite elegir la salida de audio. Se usa la predeterminada del sistema.</p>;
  const known = !sink || devices.some((d) => d.id === sink);
  return (
    <label className={cn("flex min-w-0 items-center gap-2", compact ? "" : "flex-col items-stretch")}>
      <span className={cn(compact ? "sr-only" : "text-sm font-semibold text-fg")}>Salida de audio</span>
      <select
        data-audio-output=""
        aria-label="Salida de audio"
        title="Salida de audio"
        value={known ? sink : ""}
        onChange={(e) => {
          const id = e.target.value;
          setSink(id);
          void mixer.setSink(id).then((ok) => setNote(ok ? "" : "No se pudo usar esa salida; se usa la predeterminada."));
        }}
        className={cn("rounded-md border border-line bg-sunken text-fg", compact ? "h-8 max-w-36 truncate px-1 text-xs" : "h-10 px-2 text-sm")}
      >
        <option value="">Predeterminado del sistema</option>
        {devices.map((d) => (
          <option key={d.id} value={d.id}>
            {d.label}
          </option>
        ))}
      </select>
      {note && !compact ? <span role="status" className="text-xs text-amber-300">{note}</span> : null}
    </label>
  );
}

/** Vúmetro: confirma que hay señal en la mezcla. */
export function LevelMeter({ className }: { className?: string }) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    let peak = 0;
    const tick = () => {
      const rms = mixer.level();
      // dBFS → 0..1 (−48 dB a 0 dB)
      const db = rms > 0 ? 20 * Math.log10(rms) : -100;
      const v = Math.max(0, Math.min(1, (db + 48) / 48));
      peak = Math.max(v, peak - 0.02);
      if (bar.current) {
        bar.current.style.transform = `scaleX(${peak})`;
        bar.current.dataset.level = peak.toFixed(2);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div role="meter" aria-label="Nivel de audio" aria-valuemin={0} aria-valuemax={1} title="Nivel de audio" className={cn("h-2 w-16 overflow-hidden rounded-full bg-sunken", className)}>
      <div ref={bar} data-vu="" className="h-full w-full origin-left bg-gradient-to-r from-accent via-accent to-amber-400 transition-none" style={{ transform: "scaleX(0)" }} />
    </div>
  );
}

export function TestSound({ compact = false }: { compact?: boolean }) {
  const [msg, setMsg] = useState("");
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        data-test-sound=""
        onClick={() =>
          void mixer.testTone().then((ok) => {
            const info = mixer.info();
            setMsg(ok ? "Si no oíste el tono, revisa el volumen de Windows o elige otra salida." : `El audio no arrancó (${info.state}). Haz clic otra vez.`);
          })
        }
        title="Probar sonido"
        className={cn("inline-flex items-center gap-1 rounded-md border border-line text-fg hover:bg-raised", compact ? "h-8 px-2 text-xs" : "h-10 px-3 text-sm")}
      >
        <Volume2 className="size-4" /> {compact ? <span className="sr-only">Probar sonido</span> : "Probar sonido"}
      </button>
      {msg && !compact ? <span role="status" className="text-xs text-muted">{msg}</span> : null}
    </span>
  );
}
