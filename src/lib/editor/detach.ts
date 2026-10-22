// Visor desacoplable: abre la vista previa en otra ventana (otra pantalla, pantalla completa).
// El editor sigue dibujando y su lienzo se transmite con captureStream() a un <video> en la ventana
// nueva: tiempo, play/pausa, cambios en vivo y formato quedan sincronizados sin duplicar lógica.
// El audio se queda en el editor (con la salida elegida). Web: window.open. Electron: el main
// convierte este window.open en un BrowserWindow propio (sin marco opcional, recuerda posición/monitor).
import { create } from "zustand";

export const VIEWER_NAME = "avc-viewer";

interface DetachState {
  win: Window | null;
  detached: boolean;
  open: () => boolean;
  close: () => void;
}

export interface DisplayInfo { id: number; label: string; primary: boolean; current: boolean; w: number; h: number }
export interface DesktopViewer {
  displays: () => Promise<DisplayInfo[]>;
  moveTo: (id: number, fullscreen: boolean) => Promise<void>;
  toggleFullscreen: () => Promise<boolean>;
}
/** API del visor en la versión de PC (monitores, pantalla completa en ese monitor). null en la web. */
export function desktopViewer(): DesktopViewer | null {
  return (window as unknown as { avcDesktop?: { viewer?: DesktopViewer } }).avcDesktop?.viewer ?? null;
}

let canvasGetter: (() => HTMLCanvasElement | null) | null = null;
export function registerViewerCanvas(get: () => HTMLCanvasElement | null) {
  canvasGetter = get;
}

const PAGE = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>AndromedaVideoCut · Visor</title>
<style>
html,body{margin:0;height:100%;background:#000;overflow:hidden;font-family:system-ui,sans-serif;color:#f3f3f5}
video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}
#bar{position:absolute;top:0;left:0;right:0;display:flex;gap:8px;align-items:center;padding:8px 10px;
 background:linear-gradient(#000c,#0000);opacity:0;transition:opacity .2s;-webkit-app-region:drag;user-select:none}
body:hover #bar{opacity:1}
#bar b{font-size:13px;margin-right:auto}
button{-webkit-app-region:no-drag;height:32px;padding:0 12px;border-radius:6px;border:1px solid #2c2c33;background:#1c1c21;color:#f3f3f5;font-size:13px;cursor:pointer}
button:hover{border-color:#00d4c8}
</style></head><body>
<video id="v" autoplay muted playsinline></video>
<div id="bar"><b>AndromedaVideoCut · Visor</b>
<button id="fs" title="Pantalla completa (F o doble clic)">Pantalla completa</button>
<select id="mon" title="Mover a otra pantalla" style="display:none;height:32px;border-radius:6px;background:#1c1c21;color:#f3f3f5;border:1px solid #2c2c33;-webkit-app-region:no-drag"></select>
<button id="back" title="Volver a poner el visor en el editor">Volver a acoplar</button></div>
</body></html>`;

function wire(win: Window, stream: MediaStream, onClose: () => void) {
  const doc = win.document;
  doc.open();
  doc.write(PAGE);
  doc.close();
  const video = doc.getElementById("v") as HTMLVideoElement;
  video.srcObject = stream;
  void video.play().catch(() => undefined);
  const fs = () => {
    const d = desktopViewer();
    if (d) return void d.toggleFullscreen();
    if (doc.fullscreenElement) void doc.exitFullscreen();
    else void doc.documentElement.requestFullscreen().catch(() => undefined);
  };
  const dv = desktopViewer();
  const mon = doc.getElementById("mon") as HTMLSelectElement;
  if (dv) {
    void dv.displays().then((list) => {
      if (list.length < 2) return;
      mon.style.display = "";
      mon.innerHTML = list.map((d) => `<option value="${d.id}"${d.current ? " selected" : ""}>${d.label}${d.primary ? " (principal)" : ""} · ${d.w}×${d.h}</option>`).join("");
    });
    mon.addEventListener("change", () => void dv.moveTo(Number(mon.value), false));
  }
  doc.getElementById("fs")!.addEventListener("click", fs);
  video.addEventListener("dblclick", fs);
  doc.addEventListener("keydown", (e) => {
    if (e.key === "f" || e.key === "F" || e.key === "F11") {
      e.preventDefault();
      fs();
    }
    // Espacio controla la reproducción del editor.
    if (e.key === " ") {
      e.preventDefault();
      window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space" }));
    }
  });
  doc.getElementById("back")!.addEventListener("click", () => win.close());
  win.addEventListener("pagehide", onClose);
}

export const useViewer = create<DetachState>((set, get) => ({
  win: null,
  detached: false,
  open: () => {
    const existing = get().win;
    if (existing && !existing.closed) {
      existing.focus();
      return true;
    }
    const canvas = canvasGetter?.();
    if (!canvas?.captureStream) return false;
    const win = window.open("about:blank", VIEWER_NAME, "popup=yes,width=960,height=600");
    if (!win) return false;
    const stream = canvas.captureStream(30);
    let done = false;
    const onClose = () => {
      if (done) return;
      done = true;
      for (const t of stream.getTracks()) t.stop();
      window.clearInterval(poll);
      set({ win: null, detached: false });
    };
    // Si se cierra por el sistema (Alt+F4, botón de la ventana), vuelve al editor.
    const poll = window.setInterval(() => {
      if (win.closed) onClose();
    }, 500);
    try {
      wire(win, stream, onClose);
    } catch {
      win.close();
      onClose();
      return false;
    }
    set({ win, detached: true });
    return true;
  },
  close: () => {
    const w = get().win;
    if (w && !w.closed) w.close();
    set({ win: null, detached: false });
  },
}));

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => useViewer.getState().close());
  // Para el menú de Electron ("Ver → Separar visor").
  (window as unknown as { __avcViewer: unknown }).__avcViewer = {
    open: () => useViewer.getState().open(),
    close: () => useViewer.getState().close(),
    isOpen: () => useViewer.getState().detached,
  };
}

/** Resolución del lienzo cuando el visor está separado (para que se vea nítido en pantalla grande). */
export function detachedSize(aspectW: number, aspectH: number) {
  const long = 1920;
  const s = long / Math.max(aspectW, aspectH);
  return { w: Math.round(aspectW * s), h: Math.round(aspectH * s) };
}
