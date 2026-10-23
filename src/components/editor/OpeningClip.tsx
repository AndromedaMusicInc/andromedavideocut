// B17 · Opening clip: 1.6 s, se salta con clic o tecla, una vez por sesión, se apaga en Ajustes.
import { useEffect, useState } from "react";
import { claimOpening, OPENING_CAP_MS } from "@/lib/editor/opening";

function decide() {
  if (typeof window === "undefined") return false;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  let local: Storage | null = null;
  let session: Storage | null = null;
  try { local = window.localStorage; session = window.sessionStorage; } catch { /* sin almacenamiento */ }
  return claimOpening(local, session, reduced);
}

export function OpeningClip() {
  const [show, setShow] = useState(decide);
  useEffect(() => {
    if (!show) return;
    const close = () => setShow(false);
    const t = window.setTimeout(close, OPENING_CAP_MS);
    window.addEventListener("keydown", close, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", close, true);
    };
  }, [show]);
  if (!show) return null;
  return (
    <div id="avc-open" data-opening-clip="" role="presentation" aria-label="Abriendo AndromedaVideoCut" onClick={() => setShow(false)}>
      <div className="avc-stars" />
      <div className="avc-ring" />
      <img className="avc-mark" src="./brand/mark.png" alt="" />
      <div className="avc-word"><b>Andromeda</b><span>VideoCut</span></div>
      <div className="avc-beat"><i /><i /><i /><i /><i /></div>
      <small className="avc-skip">Toca o pulsa una tecla para saltar</small>
    </div>
  );
}
