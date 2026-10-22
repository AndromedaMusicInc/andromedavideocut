type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void; webkitFullscreenEnabled?: boolean };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

export function fullscreenElement(): Element | null {
  const d = document as FsDoc;
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

export function fullscreenAllowed(): boolean {
  const d = document as FsDoc;
  return Boolean(d.fullscreenEnabled ?? d.webkitFullscreenEnabled);
}

/** Abre la app en una pestaña nueva (respaldo cuando el iframe no permite pantalla completa). */
export function openInNewTab() {
  window.open(window.location.href, "_blank", "noopener");
}

/**
 * Alterna pantalla completa sobre `el`. Devuelve "blocked" si el navegador o el
 * iframe no lo permiten; en ese caso ya se abrió la app en una pestaña nueva
 * (se hace de forma síncrona, dentro del gesto del usuario, para que no la bloqueen).
 */
export async function toggleFullscreen(el: HTMLElement): Promise<"on" | "off" | "blocked"> {
  const d = document as FsDoc;
  const current = fullscreenElement();
  if (current) {
    await (d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen?.());
    if (current === el) return "off";
  }
  const target = el as FsEl;
  if (!fullscreenAllowed() || !(target.requestFullscreen || target.webkitRequestFullscreen)) {
    openInNewTab();
    return "blocked";
  }
  try {
    await (target.requestFullscreen ? target.requestFullscreen() : target.webkitRequestFullscreen?.());
    return "on";
  } catch {
    openInNewTab();
    return "blocked";
  }
}

export function onFullscreenChange(cb: () => void) {
  document.addEventListener("fullscreenchange", cb);
  document.addEventListener("webkitfullscreenchange", cb);
  return () => {
    document.removeEventListener("fullscreenchange", cb);
    document.removeEventListener("webkitfullscreenchange", cb);
  };
}
