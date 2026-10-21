const KEY = "andromeda.grok-key";

export function getGrokKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw && raw.trim().length > 12 ? raw.trim() : null;
  } catch {
    return null;
  }
}

export function setGrokKey(value: string) {
  if (typeof window === "undefined") return;
  try {
    const clean = value.trim();
    if (clean) window.localStorage.setItem(KEY, clean);
    else window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function hasGrokKey(): boolean {
  return Boolean(getGrokKey());
}
