// Feed de Andromeda (música, playlists, videos, noticias). Google Sites no tiene RSS y bloquea iframes,
// así que se publica un JSON en gh-pages. Orden: en línea → caché → copia empaquetada (sin internet).
export const FEED_URL = "https://andromedamusicinc.github.io/andromedavideocut/feed/andromeda-feed.json";
const BUNDLED = "./feed/andromeda-feed.json";
const CACHE_KEY = "avc.feed.v1";

export interface FeedItem {
  title: string;
  artist?: string | null;
  image?: string | null;
  link: string;
  date?: string | null;
  embed?: string;
  youtubeId?: string;
  tracks?: number | null;
}
export interface Feed {
  version: 1;
  updated: string;
  source: string;
  about?: string;
  contact?: string;
  news: { title: string; text: string; link: string; date?: string | null }[];
  releases: FeedItem[];
  playlists: FeedItem[];
  videos: FeedItem[];
  artists: { name: string; link: string; page?: string }[];
}
export type FeedOrigin = "en-linea" | "cache" | "empaquetado";

const httpsOnly = (u: unknown) => typeof u === "string" && /^https:\/\//.test(u);

/** Valida y limpia: solo enlaces https, sin campos raros. */
export function parseFeed(text: string): Feed | null {
  try {
    const d = JSON.parse(text) as Feed;
    if (!d || d.version !== 1 || !Array.isArray(d.releases)) return null;
    const items = (list: FeedItem[] | undefined) =>
      (Array.isArray(list) ? list : [])
        .filter((i) => i && typeof i.title === "string" && httpsOnly(i.link))
        .map((i) => ({
          ...i,
          image: httpsOnly(i.image) ? i.image : null,
          embed: typeof i.embed === "string" && /^https:\/\/open\.spotify\.com\/embed\//.test(i.embed) ? i.embed : undefined,
          youtubeId: typeof i.youtubeId === "string" && /^[A-Za-z0-9_-]{11}$/.test(i.youtubeId) ? i.youtubeId : undefined,
        }));
    return {
      ...d,
      news: (Array.isArray(d.news) ? d.news : []).filter((n) => n && typeof n.title === "string" && httpsOnly(n.link)),
      releases: items(d.releases),
      playlists: items(d.playlists),
      videos: items(d.videos),
      artists: (Array.isArray(d.artists) ? d.artists : []).filter((a) => a && typeof a.name === "string" && httpsOnly(a.link)),
    };
  } catch {
    return null;
  }
}

type Bridge = { feedCache?: (op: "get" | "set", text?: string) => Promise<string | null> };
const bridge = () => (window as unknown as { avcDesktop?: Bridge }).avcDesktop;

async function cacheGet() {
  const b = bridge();
  if (b?.feedCache) return b.feedCache("get");
  try {
    return localStorage.getItem(CACHE_KEY);
  } catch {
    return null;
  }
}
async function cacheSet(text: string) {
  const b = bridge();
  if (b?.feedCache) return void b.feedCache("set", text);
  try {
    localStorage.setItem(CACHE_KEY, text);
  } catch {
    /* sin espacio */
  }
}

export async function loadFeed(url = FEED_URL): Promise<{ feed: Feed; origin: FeedOrigin } | null> {
  try {
    const ctl = new AbortController();
    const t = window.setTimeout(() => ctl.abort(), 6000);
    const res = await fetch(`${url}?t=${Math.floor(Date.now() / 3_600_000)}`, { signal: ctl.signal, cache: "no-store" });
    window.clearTimeout(t);
    if (res.ok) {
      const text = await res.text();
      const feed = parseFeed(text);
      if (feed) {
        void cacheSet(text);
        return { feed, origin: "en-linea" };
      }
    }
  } catch {
    /* sin internet o bloqueado */
  }
  const cached = await cacheGet();
  const fromCache = cached ? parseFeed(cached) : null;
  if (fromCache) return { feed: fromCache, origin: "cache" };
  try {
    const res = await fetch(BUNDLED);
    const feed = parseFeed(await res.text());
    if (feed) return { feed, origin: "empaquetado" };
  } catch {
    /* nada */
  }
  return null;
}

export function openLink(url: string) {
  const d = (window as unknown as { avcDesktop?: { openExternal(u: string): Promise<void> } }).avcDesktop;
  if (d) void d.openExternal(url);
  else window.open(url, "_blank", "noopener,noreferrer");
}
