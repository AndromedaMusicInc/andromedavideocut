// B17 · Opening clip (diseño de VideoCut · Visual). Lógica pura: cuándo se muestra y el interruptor de Ajustes.
export const OPENING_PREF = "avc.openingClip"; // localStorage: 'off' = apagado
export const OPENING_SEEN = "avc.opened"; // sessionStorage: ya se mostró en esta sesión
export const OPENING_MS = 1600;
export const OPENING_CAP_MS = 1700; // tope: nunca bloquea más de 1.7 s

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function openingEnabled(local: Store | null) {
  return safe(() => local?.getItem(OPENING_PREF) !== "off", true);
}

export function setOpeningEnabled(local: Store | null, on: boolean) {
  safe(() => (on ? local?.removeItem(OPENING_PREF) : local?.setItem(OPENING_PREF, "off")), undefined);
}

/** Decide si mostrar el clip y, si sí, marca la sesión. Con movimiento reducido no se muestra. */
export function claimOpening(local: Store | null, session: Store | null, reducedMotion: boolean) {
  if (reducedMotion || !openingEnabled(local)) return false;
  if (safe(() => session?.getItem(OPENING_SEEN), null)) return false;
  safe(() => session?.setItem(OPENING_SEEN, "1"), undefined);
  return true;
}
