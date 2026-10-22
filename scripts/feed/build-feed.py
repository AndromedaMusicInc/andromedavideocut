#!/usr/bin/env python3
"""Genera public/feed/andromeda-feed.json a partir de datos REALES de www.andromedamusicinc.com.

Uso (desde la raíz del repo):
    python3 scripts/feed/build-feed.py            # vuelve a leer el sitio y Spotify/YouTube (oEmbed)
    python3 scripts/feed/build-feed.py --offline  # solo reconstruye desde scripts/feed/fuente-cruda.json

No inventa nada: títulos, artistas, imágenes y fechas vienen de oEmbed de Spotify/YouTube y de la
página de inserción de Spotify. Si una fecha no está disponible queda en null.
"""
import glob, html, json, re, sys, urllib.parse, urllib.request, datetime, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
RAW = ROOT / "scripts/feed/fuente-cruda.json"
OUT = ROOT / "public/feed/andromeda-feed.json"
SITE = "https://www.andromedamusicinc.com"
PAGES = ["", "yuriexx", "xinex", "riczeus", "j-obcy", "leroy-cuántico", "sesión-21", "yamilo-clemente", "ǝve-studios"]
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36", "Accept-Language": "es,en"}

def get(u):
    try:
        return urllib.request.urlopen(urllib.request.Request(urllib.parse.quote(u, safe=":/?=&%@"), headers=UA), timeout=25).read().decode("utf-8", "ignore")
    except Exception:
        return ""

def scrape():
    found = {}
    for p in PAGES:
        s = urllib.parse.unquote(urllib.parse.unquote(get(f"{SITE}/{p}")))
        for k, i in re.findall(r"open\.spotify\.com/(?:embed/)?(track|playlist|album|artist)/([A-Za-z0-9]{22})", s):
            found.setdefault((k, i), p or "inicio")
        for i in re.findall(r"youtube\.com/embed/([A-Za-z0-9_-]{11})", s):
            found.setdefault(("video", i), p or "inicio")
    out = []
    for (k, i), page in sorted(found.items()):
        if k == "video":
            u = f"https://www.youtube.com/watch?v={i}"
            o = json.loads(get("https://www.youtube.com/oembed?format=json&url=" + urllib.parse.quote(u, safe="")) or "{}")
            out.append(dict(page=page, type="video", id=i, url=u, title=o.get("title"), artist=(o.get("author_name") or "").strip(), image=o.get("thumbnail_url"), date=None))
            continue
        u = f"https://open.spotify.com/{k}/{i}"
        o = json.loads(get("https://open.spotify.com/oembed?url=" + urllib.parse.quote(u, safe="")) or "{}")
        x = dict(page=page, type=k, url=u, title=o.get("title"), image=o.get("thumbnail_url"), date=None, artist=None)
        m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', get(u.replace(".com/", ".com/embed/")), re.S)
        if m:
            try:
                e = json.loads(m.group(1))["props"]["pageProps"]["state"]["data"]["entity"]
                x["artist"] = ", ".join(a["name"] for a in e.get("artists", [])) or e.get("subtitle")
                rd = e.get("releaseDate")
                x["date"] = (rd.get("isoString") or "")[:10] if isinstance(rd, dict) else None
                x["n"] = len(e.get("trackList") or [])
            except Exception:
                pass
        out.append(x)
    return out

def page_url(p):
    return SITE if p in ("", "inicio", "amsite") else f"{SITE}/{p}"

def build(raw):
    rel = [r for r in raw if r["type"] == "track"]
    rel.sort(key=lambda r: r.get("date") or "", reverse=True)
    pls = [r for r in raw if r["type"] == "playlist"]
    vids = [r for r in raw if r["type"] == "video"]
    arts = [r for r in raw if r["type"] == "artist"]
    feed = {
        "version": 1,
        "updated": datetime.date.today().isoformat(),
        "source": SITE,
        "about": "Andromeda Music Inc. — casa creativa y sello musical: producción, composición, grabación, mezcla, distribución y estrategia de lanzamiento.",
        "contact": "info@andromedamusicinc.com",
        "news": [
            {"title": "Lanzamiento reciente: WARZONE", "text": "Yuriexx x Los Andrómedas. Prod. by Xinex & Riczeus.", "link": SITE, "date": next((r["date"] for r in rel if (r["title"] or "").lower() == "warzone"), None)},
            {"title": "Próximos lanzamientos", "text": "Nueva música, nuevos artistas y nuevos visuales muy pronto.", "link": SITE, "date": None},
            {"title": "Andromeda Lo-Fi", "text": "Sonidos para concentrarte, dormir, estudiar y la madrugada.", "link": SITE, "date": None},
        ],
        "releases": [{"title": r["title"], "artist": r.get("artist"), "image": r.get("image"), "link": r["url"], "date": r.get("date"), "embed": r["url"].replace(".com/", ".com/embed/")} for r in rel],
        "playlists": [{"title": r["title"], "artist": r.get("artist") or "Andromeda", "image": r.get("image"), "link": r["url"], "tracks": r.get("n"), "date": None, "embed": r["url"].replace(".com/", ".com/embed/")} for r in pls],
        "videos": [{"title": r["title"], "artist": r.get("artist"), "image": r.get("image"), "link": r["url"], "date": r.get("date"), "youtubeId": r["id"]} for r in vids],
        "artists": [{"name": r["title"], "link": r["url"], "page": page_url(r["page"])} for r in arts],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(feed, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{OUT.relative_to(ROOT)}: {len(feed['releases'])} lanzamientos, {len(feed['playlists'])} playlists, {len(feed['videos'])} videos, {len(feed['artists'])} artistas")

if __name__ == "__main__":
    if "--offline" in sys.argv:
        raw = json.loads(RAW.read_text(encoding="utf-8"))
    else:
        raw = scrape()
        RAW.write_text(json.dumps(raw, ensure_ascii=False, indent=1), encoding="utf-8")
    build(raw)
