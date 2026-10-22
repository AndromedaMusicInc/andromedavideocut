import { loadFeed, openLink, type Feed, type FeedItem, type FeedOrigin } from "@/lib/andromeda/feed";
import { createProject, deleteProject, duplicateProject, formatBytes, formatDate, formatDuration, listProjects, renameProject, restoreProject, trashProject, writeProject, type ProjectMeta } from "@/lib/editor/projects";
import type { ToolId } from "@/lib/editor/types";
import { ConnectGrokWizard, SettingsDialog, useAiBoot } from "@/components/editor/ConnectGrok";
import { useAi } from "@/lib/ai/xai";
import { ASPECTS, type AspectId } from "@/lib/editor/types";
import { cn } from "@/lib/cn";
import { Activity, ArchiveRestore, Copy, Download, ExternalLink, Film, FolderOpen, House, LayoutGrid, LayoutTemplate, List, ListMusic, Lock, Mic2, Music2, Newspaper, Pencil, Play, Plus, RefreshCw, Search, Settings, Sparkles, Trash2, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";

const BASE = import.meta.env.BASE_URL;
const ASPECT_ORDER: AspectId[] = ["9:16", "16:9", "1:1", "4:5"];
const ASPECT_USE: Record<AspectId, string> = { "9:16": "Reels, TikTok, Shorts", "16:9": "YouTube", "1:1": "Post cuadrado", "4:5": "Feed de Instagram" };

function AspectBox({ aspect, className }: { aspect: AspectId; className?: string }) {
  const a = ASPECTS[aspect];
  const r = a.w / a.h;
  return <span className={cn("block rounded-sm border-2 border-current", className)} style={{ width: r >= 1 ? 28 : 28 * r, height: r >= 1 ? 28 / r : 28 }} />;
}

function NewProjectDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (aspect: AspectId, template: "vacio" | "ejemplo", name: string) => void }) {
  const [aspect, setAspect] = useState<AspectId>("9:16");
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg/80 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="np-title" data-new-dialog="" className="w-full max-w-lg rounded-lg border border-line bg-raised p-5">
        <div className="flex items-center justify-between">
          <h2 id="np-title" className="text-base font-semibold">Nuevo proyecto</h2>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="grid size-9 place-items-center rounded-md hover:bg-surface">
            <X className="size-4" />
          </button>
        </div>
        <label className="mt-4 flex flex-col gap-1 text-sm">
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mi proyecto" maxLength={48} className="h-10 rounded-md border border-line bg-sunken px-3 text-fg" />
        </label>
        <p className="mt-4 text-sm font-semibold text-fg">Formato</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {ASPECT_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              data-aspect={id}
              aria-pressed={aspect === id}
              onClick={() => setAspect(id)}
              className={cn("flex flex-col items-center gap-2 rounded-md border p-3 text-xs", aspect === id ? "border-accent bg-accent/10 text-accent" : "border-line text-muted hover:text-fg")}
            >
              <span className="grid h-8 place-items-center">
                <AspectBox aspect={id} />
              </span>
              <span className="font-semibold text-fg">{id}</span>
              <span className="text-center leading-tight">{ASPECT_USE[id]}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm font-semibold text-fg">Empezar con</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" data-create="vacio" onClick={() => onCreate(aspect, "vacio", name.trim() || "Proyecto nuevo")} className="h-12 rounded-md bg-accent font-semibold text-accent-ink">
            Proyecto vacío
          </button>
          <button type="button" data-create="ejemplo" onClick={() => onCreate(aspect, "ejemplo", name.trim() || "Plantilla de ejemplo")} className="h-12 rounded-md border border-line font-semibold text-fg hover:bg-surface">
            Plantilla de ejemplo
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">La plantilla trae título, subtítulo, fondo animado y música de ejemplo para editar encima.</p>
      </div>
    </div>
  );
}

function FeedCard({ item, kind }: { item: FeedItem; kind: "release" | "playlist" | "video" }) {
  const [broken, setBroken] = useState(false);
  const [playing, setPlaying] = useState(false);
  const year = item.date ? new Date(`${item.date}T12:00:00`) : null;
  return (
    <li data-feed-item={kind} className="flex w-44 shrink-0 flex-col overflow-hidden rounded-lg border border-line bg-surface">
      {playing && (item.embed || item.youtubeId) ? (
        <iframe
          title={item.title}
          src={item.embed ? `${item.embed}?utm_source=generator&theme=0` : `https://www.youtube-nocookie.com/embed/${item.youtubeId}?autoplay=1`}
          className={cn("w-full border-0", kind === "video" ? "aspect-video" : "h-[152px]")}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      ) : (
        <button type="button" onClick={() => openLink(item.link)} title={`Abrir en ${kind === "video" ? "YouTube" : "Spotify"}`} className={cn("relative grid place-items-center overflow-hidden bg-gradient-to-br from-accent/30 to-sunken", kind === "video" ? "aspect-video" : "aspect-square")}>
          {item.image && !broken ? <img src={item.image} alt="" loading="lazy" onError={() => setBroken(true)} className="size-full object-cover" /> : kind === "video" ? <Film className="size-8 text-accent" /> : <Music2 className="size-8 text-accent" />}
        </button>
      )}
      <div className="flex flex-1 flex-col gap-0.5 p-2">
        <p className="line-clamp-2 text-sm font-semibold text-fg" title={item.title}>{item.title}</p>
        {item.artist ? <p className="truncate text-xs text-muted" title={item.artist}>{item.artist}</p> : null}
        {year ? <p className="text-[11px] text-faint">{new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric" }).format(year)}</p> : null}
        {kind === "playlist" && item.tracks ? <p className="text-[11px] text-faint">{item.tracks} canciones</p> : null}
        <div className="mt-auto flex gap-2 pt-1 text-xs">
          {item.embed || item.youtubeId ? (
            <button type="button" data-listen="" onClick={() => setPlaying((v) => !v)} className="font-semibold text-accent hover:underline">{playing ? "Cerrar" : kind === "video" ? "Ver aquí" : "Escuchar aquí"}</button>
          ) : null}
          <button type="button" onClick={() => openLink(item.link)} className="inline-flex items-center gap-0.5 text-muted hover:text-fg">Abrir <ExternalLink className="size-3" /></button>
        </div>
      </div>
    </li>
  );
}

function Row({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">{icon}{title}</h3>
      <ul className="flex gap-3 overflow-x-auto pb-2">{children}</ul>
    </section>
  );
}


type Section = "inicio" | "plantillas" | "andromeda" | "biblioteca";
type OpenFn = (p: ProjectMeta, tool?: ToolId) => void;
const GOLD = "#D4AF37";
const PURPLE = "#7B3FE4";

function useFeed() {
  const [state, setState] = useState<{ feed: Feed; origin: FeedOrigin } | null | "loading">("loading");
  useEffect(() => {
    void loadFeed().then(setState);
  }, []);
  return state;
}

function BigFeedCard({ item, kind }: { item: FeedItem; kind: "release" | "playlist" }) {
  const [broken, setBroken] = useState(false);
  return (
    <button type="button" data-feed-item={kind} onClick={() => openLink(item.link)} title={`${item.title} · abrir en Spotify`} className="group flex w-[220px] shrink-0 flex-col overflow-hidden rounded-xl border border-[#23232F] bg-[#15151F] text-left hover:border-[#D4AF37]/60">
      <span className="relative block aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#7B3FE4]/40 to-[#0B0B12]">
        {item.image && !broken ? <img src={item.image} alt="" loading="lazy" onError={() => setBroken(true)} className="size-full object-cover transition group-hover:scale-105" /> : null}
        <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold" style={{ color: GOLD }}>{kind === "release" ? "LANZAMIENTO" : "PLAYLIST"}</span>
      </span>
      <span className="flex flex-col gap-0.5 p-2.5">
        <span className="truncate text-sm font-semibold text-white">{item.title}</span>
        <span className="truncate text-xs text-[#8A8A9A]">{kind === "playlist" && item.tracks ? `${item.tracks} canciones · ${item.artist ?? ""}` : (item.artist ?? "")}</span>
      </span>
    </button>
  );
}

function FullFeed({ state }: { state: ReturnType<typeof useFeed> }) {
  if (state === "loading") return <p className="text-sm text-muted">Cargando novedades de Andromeda…</p>;
  if (!state) return <p className="text-sm text-muted">No se pudieron cargar las novedades.</p>;
  const { feed, origin } = state;
  return (
    <div data-feed-origin={origin}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="max-w-2xl text-sm text-[#8A8A9A]">{feed.about}</p>
        <p className="text-[11px] text-faint">{origin === "en-linea" ? "Actualizado" : origin === "cache" ? "Sin conexión · guardado" : "Sin conexión · incluido en la app"} · {feed.updated}</p>
      </div>
      <Row title="Noticias" icon={<Newspaper className="size-4" style={{ color: GOLD }} />}>
        {feed.news.map((n) => (
          <li key={n.title} data-feed-item="news" className="w-64 shrink-0 rounded-lg border border-[#23232F] bg-[#15151F] p-3">
            <p className="text-sm font-semibold text-fg">{n.title}</p>
            <p className="mt-1 text-xs text-muted">{n.text}</p>
            <button type="button" onClick={() => openLink(n.link)} className="mt-2 inline-flex items-center gap-1 text-xs hover:underline" style={{ color: GOLD }}>andromedamusicinc.com <ExternalLink className="size-3" /></button>
          </li>
        ))}
      </Row>
      <Row title="Lanzamientos" icon={<Music2 className="size-4" style={{ color: GOLD }} />}>{feed.releases.map((i) => <FeedCard key={i.link} item={i} kind="release" />)}</Row>
      <Row title="Playlists" icon={<ListMusic className="size-4" style={{ color: GOLD }} />}>{feed.playlists.map((i) => <FeedCard key={i.link} item={i} kind="playlist" />)}</Row>
      <Row title="Videos" icon={<Film className="size-4" style={{ color: GOLD }} />}>{feed.videos.map((i) => <FeedCard key={i.link} item={i} kind="video" />)}</Row>
      <section className="mt-4">
        <h3 className="mb-2 text-sm font-semibold text-fg">Artistas</h3>
        <div className="flex flex-wrap gap-2">
          {feed.artists.map((a) => (
            <button key={a.link} type="button" onClick={() => openLink(a.page || a.link)} className="rounded-full border border-[#23232F] px-3 py-1 text-xs text-fg hover:border-[#D4AF37]">{a.name}</button>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProjectTile({ p, view, trash, onOpen, onChanged }: { p: ProjectMeta; view: "grid" | "list"; trash: boolean; onOpen: () => void; onChanged: () => void }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(p.name);
  const [confirm, setConfirm] = useState(false);
  const meta = `${formatBytes(p.bytes)} | ${formatDuration(p.duration)}`;
  const thumb = (
    <span className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-lg bg-[#15151F]", view === "grid" ? "aspect-square w-full" : "size-14")}>
      {p.thumb ? <img src={p.thumb} alt="" className="size-full object-cover" /> : <span className="text-faint"><AspectBox aspect={p.aspect} /></span>}
      {view === "grid" ? <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1 text-[10px] font-semibold text-white">{p.aspect}</span> : null}
    </span>
  );
  const actions = trash ? (
    <div className="flex gap-1">
      <button type="button" data-restore="" title="Recuperar" aria-label={`Recuperar ${p.name}`} onClick={() => void restoreProject(p).then(onChanged)} className="grid size-7 place-items-center rounded hover:bg-[#23232F]"><ArchiveRestore className="size-4" /></button>
      <button type="button" data-delete-forever="" title="Borrar para siempre" aria-label={`Borrar para siempre ${p.name}`} onClick={() => setConfirm(true)} className="grid size-7 place-items-center rounded text-red-300 hover:bg-[#23232F]"><Trash2 className="size-4" /></button>
    </div>
  ) : (
    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
      <button type="button" data-rename="" title="Renombrar" aria-label={`Renombrar ${p.name}`} onClick={() => setRenaming((v) => !v)} className="grid size-7 place-items-center rounded hover:bg-[#23232F]"><Pencil className="size-3.5" /></button>
      <button type="button" data-duplicate="" title="Duplicar" aria-label={`Duplicar ${p.name}`} onClick={() => void duplicateProject(p.id).then(onChanged)} className="grid size-7 place-items-center rounded hover:bg-[#23232F]"><Copy className="size-3.5" /></button>
      <button type="button" data-delete="" title="Mover a la papelera" aria-label={`Mover a la papelera ${p.name}`} onClick={() => setConfirm(true)} className="grid size-7 place-items-center rounded text-red-300 hover:bg-[#23232F]"><Trash2 className="size-3.5" /></button>
    </div>
  );
  return (
    <li data-project={p.id} className={cn("group", view === "list" && "flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-[#15151F]")}>
      <button type="button" data-open-project="" disabled={trash} onClick={onOpen} title={trash ? "Recupéralo para abrirlo" : `Abrir ${p.name}`} className={cn("block text-left", view === "grid" ? "w-full" : "shrink-0")}>{thumb}</button>
      <div className={cn("min-w-0", view === "grid" ? "mt-1.5" : "flex flex-1 items-center gap-4")}>
        {renaming ? (
          <form onSubmit={(e) => { e.preventDefault(); void renameProject(p, name).then(() => { setRenaming(false); onChanged(); }); }} className="flex gap-1">
            <input autoFocus aria-label="Nuevo nombre" value={name} maxLength={48} onChange={(e) => setName(e.target.value)} className="h-7 min-w-0 flex-1 rounded border border-[#23232F] bg-[#0B0B12] px-2 text-sm" />
            <button type="submit" className="h-7 rounded px-2 text-xs font-semibold text-[#0B0B12]" style={{ background: GOLD }}>OK</button>
          </form>
        ) : (
          <p data-project-name="" className={cn("truncate text-sm font-medium text-white", view === "list" && "w-64")} title={p.name}>{p.name}</p>
        )}
        <div className={cn("flex items-center justify-between gap-1", view === "list" && "flex-1")}>
          <p data-project-meta="" className="text-xs tabular-nums text-[#8A8A9A]">{meta}{view === "list" ? <span className="ml-4">{formatDate(p.updatedAt)}</span> : null}</p>
          {actions}
        </div>
      </div>
      {confirm ? (
        <div role="alertdialog" aria-modal="true" aria-label="Confirmar" data-confirm-delete="" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-xl border border-[#23232F] bg-[#15151F] p-5">
            <p className="text-base font-semibold text-white">{trash ? `¿Borrar “${p.name}” para siempre?` : `¿Mover “${p.name}” a la papelera?`}</p>
            <p className="mt-1 text-sm text-[#8A8A9A]">{trash ? "Se borran el proyecto y sus archivos importados. No se puede deshacer." : "Podrás recuperarlo desde la Papelera."}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirm(false)} className="h-10 rounded-md border border-[#23232F] px-3 text-sm">Cancelar</button>
              <button type="button" data-confirm="" onClick={() => void (trash ? deleteProject(p.id) : trashProject(p)).then(() => { setConfirm(false); onChanged(); })} className="h-10 rounded-md bg-red-500 px-3 text-sm font-semibold text-white">{trash ? "Borrar" : "Mover a la papelera"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function Projects({ projects, onOpen, refresh, title = "Proyectos" }: { projects: ProjectMeta[] | null; onOpen: OpenFn; refresh: () => void; title?: string }) {
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [view, setView] = useState<"grid" | "list">(() => (localStorage.getItem("avc.projects.view") === "list" ? "list" : "grid"));
  const [trash, setTrash] = useState(false);
  const list = (projects ?? []).filter((p) => Boolean(p.trashedAt) === trash && p.name.toLowerCase().includes(q.trim().toLowerCase()));
  const trashCount = (projects ?? []).filter((p) => p.trashedAt).length;
  return (
    <section data-projects-section="" className="mt-8">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-base font-semibold text-white">{trash ? "Papelera" : title}</h2>
        {searching ? (
          <input autoFocus data-project-search="" aria-label="Buscar proyectos" placeholder="Buscar proyectos" value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => !q && setSearching(false)} className="h-8 w-48 rounded-md border border-[#23232F] bg-[#15151F] px-2 text-sm" />
        ) : (
          <button type="button" aria-label="Buscar proyectos" title="Buscar" onClick={() => setSearching(true)} className="grid size-8 place-items-center rounded-md border border-[#23232F] hover:border-[#D4AF37]"><Search className="size-4" /></button>
        )}
        <button type="button" data-view-toggle="" aria-label={view === "grid" ? "Ver como lista" : "Ver como cuadrícula"} title={view === "grid" ? "Lista" : "Cuadrícula"} onClick={() => { const v = view === "grid" ? "list" : "grid"; setView(v); localStorage.setItem("avc.projects.view", v); }} className="grid size-8 place-items-center rounded-md border border-[#23232F] hover:border-[#D4AF37]">
          {view === "grid" ? <List className="size-4" /> : <LayoutGrid className="size-4" />}
        </button>
        <button type="button" data-trash-toggle="" aria-pressed={trash} onClick={() => setTrash((v) => !v)} className={cn("inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold", trash ? "border-[#D4AF37] text-[#D4AF37]" : "border-[#23232F] hover:border-[#D4AF37]")}>
          <Trash2 className="size-3.5" /> {trash ? "Volver a proyectos" : `Papelera${trashCount ? ` (${trashCount})` : ""}`}
        </button>
      </div>
      {projects === null ? (
        <p className="mt-3 text-sm text-muted">Cargando…</p>
      ) : list.length === 0 ? (
        <p data-empty="" className="mt-6 text-center text-sm text-[#8A8A9A]">{trash ? "La papelera está vacía." : q ? "Ningún proyecto con ese nombre." : "Todavía no tienes proyectos. Toca Crear proyecto."}</p>
      ) : (
        <ul data-projects="" className={cn("mt-3", view === "grid" ? "grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-x-3 gap-y-4" : "flex flex-col")}>
          {list.map((p) => <ProjectTile key={`${p.id}-${p.updatedAt}-${p.trashedAt ?? 0}`} p={p} view={view} trash={trash} onOpen={() => onOpen(p)} onChanged={refresh} />)}
        </ul>
      )}
    </section>
  );
}

function NavItem({ id, cur, set, icon, label }: { id: Section; cur: Section; set: (s: Section) => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" data-nav={id} aria-current={cur === id ? "page" : undefined} onClick={() => set(id)} className={cn("flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm", cur === id ? "bg-[#15151F] font-semibold text-white" : "text-[#C9C9D4] hover:bg-[#15151F]/60")}>
      {icon}
      {label}
    </button>
  );
}

export function Welcome({ onOpen }: { onOpen: OpenFn }) {
  const [projects, setProjects] = useState<ProjectMeta[] | null>(null);
  const [creating, setCreating] = useState<null | "vacio" | "ejemplo">(null);
  const [section, setSection] = useState<Section>("inicio");
  const [updMsg, setUpdMsg] = useState("");
  const feed = useFeed();
  const ai = useAi();
  useAiBoot();
  const refresh = () => void listProjects().then(setProjects);
  useEffect(refresh, []);
  const desk = (window as unknown as { avcDesktop?: { checkUpdates?: () => Promise<void> } }).avcDesktop;
  const quick = async (template: "vacio" | "ejemplo", tool: ToolId, name: string) => onOpen(await createProject(name, "9:16", template), tool);
  const feedItems = feed && feed !== "loading" ? [...feed.feed.releases.slice(0, 6).map((i) => ({ i, k: "release" as const })), ...feed.feed.playlists.map((i) => ({ i, k: "playlist" as const }))] : [];
  return (
    <div data-welcome="" className="flex h-dvh select-none bg-[#0B0B12] text-fg">
      <aside className="flex w-56 shrink-0 flex-col border-r border-[#23232F] bg-[#0B0B12] p-3">
        <div className="mb-4 flex items-center gap-2 px-1">
          <span className="grid size-9 place-items-center rounded-full border border-[#D4AF37] bg-[#15151F]"><img src={`${BASE}brand/mark.png`} alt="" className="size-6 object-contain" /></span>
          <span className="text-[15px] font-bold leading-tight text-white">Andromeda<span style={{ color: GOLD }}>VideoCut</span></span>
        </div>
        <nav className="flex flex-col gap-0.5" aria-label="Secciones">
          <NavItem id="inicio" cur={section} set={setSection} icon={<House className="size-4" />} label="Inicio" />
          <NavItem id="plantillas" cur={section} set={setSection} icon={<LayoutTemplate className="size-4" />} label="Plantillas" />
          <NavItem id="andromeda" cur={section} set={setSection} icon={<Music2 className="size-4" />} label="Andromeda" />
          <NavItem id="biblioteca" cur={section} set={setSection} icon={<FolderOpen className="size-4" />} label="Biblioteca" />
        </nav>
        <div className="mt-auto flex flex-col gap-0.5 border-t border-[#23232F] pt-2">
          <button type="button" data-open-settings="" onClick={() => ai.openSettings()} className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm text-[#C9C9D4] hover:bg-[#15151F]"><Settings className="size-4" /> Ajustes</button>
          <button
            type="button"
            data-check-updates=""
            onClick={() => {
              if (desk?.checkUpdates) void desk.checkUpdates();
              else setUpdMsg("En la web siempre tienes la última versión.");
            }}
            className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm text-[#C9C9D4] hover:bg-[#15151F]"
          >
            <RefreshCw className="size-4" /> Buscar actualizaciones
          </button>
          {updMsg ? <p role="status" className="px-2.5 text-[11px] text-[#8A8A9A]">{updMsg}</p> : null}
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto px-6 pb-10 pt-5">
        {section === "inicio" ? (
          <>
            <button type="button" data-new-project="" onClick={() => setCreating("vacio")} className="group relative grid h-36 w-full place-items-center overflow-hidden rounded-2xl text-white shadow-[0_8px_32px_rgba(123,63,228,0.25)]" style={{ background: `linear-gradient(110deg, ${PURPLE} 0%, #3b1f8a 38%, #0f5f6a 72%, #00d4c8 100%)` }}>
              <span className="pointer-events-none absolute inset-0 opacity-40" style={{ background: "radial-gradient(circle at 80% 20%, rgba(212,175,55,.55), transparent 45%)" }} />
              <span className="relative flex items-center gap-3 text-2xl font-bold"><span className="grid size-9 place-items-center rounded-lg bg-[#0B0B12] text-white transition group-hover:scale-110"><Plus className="size-5" /></span> Crear proyecto</span>
            </button>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
              {[
                { id: "plantillas", t: "Plantillas", d: "Empieza con un ejemplo editable", icon: <LayoutTemplate className="size-5" />, go: () => setCreating("ejemplo") },
                { id: "tempo", t: "Modo Tempo / BPM", d: "Cortes al ritmo de tu canción", icon: <Activity className="size-5" />, go: () => void quick("ejemplo", "reel", "Reel al ritmo") },
                { id: "karaoke", t: "Karaoke / Letras", d: "Pega la letra y arma el reel", icon: <Mic2 className="size-5" />, go: () => void quick("ejemplo", "reel", "Karaoke") },
                { id: "importar", t: "Importar medios", d: "Videos, fotos y música", icon: <Upload className="size-5" />, go: () => void quick("vacio", "media", "Proyecto nuevo") },
              ].map((c) => (
                <button key={c.id} type="button" data-quick={c.id} onClick={c.go} className="flex min-h-24 flex-col items-start gap-1 rounded-xl border border-[#23232F] bg-[#15151F] p-3 text-left hover:border-[#D4AF37]/60">
                  <span className="grid size-9 place-items-center rounded-lg bg-[#0B0B12]" style={{ color: GOLD }}>{c.icon}</span>
                  <span className="text-sm font-semibold text-white">{c.t}</span>
                  <span className="text-xs text-[#8A8A9A]">{c.d}</span>
                </button>
              ))}
              <button type="button" data-quick="ia" onClick={() => ai.openWizard()} className="relative flex min-h-24 flex-col items-start gap-1 rounded-xl border border-[#7B3FE4]/50 bg-gradient-to-br from-[#7B3FE4]/25 to-[#15151F] p-3 text-left hover:border-[#7B3FE4]">
                <span className="grid size-9 place-items-center rounded-lg bg-[#0B0B12] text-[#B794FF]"><Sparkles className="size-5" /></span>
                <span className="text-sm font-semibold text-white">IA con Grok</span>
                <span className="text-xs text-[#8A8A9A]">{ai.connected ? `Conectado: ${ai.name || "tu cuenta"}` : "Conecta tu cuenta de Grok"}</span>
                {!ai.connected ? <Lock aria-label="Bloqueado" className="absolute right-3 top-3 size-4 text-[#B794FF]" /> : null}
              </button>
            </div>
            <section className="mt-8">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">Lo nuevo de Andromeda</h2>
                <button type="button" onClick={() => setSection("andromeda")} className="text-xs hover:underline" style={{ color: GOLD }}>Ver todo</button>
              </div>
              {feed === "loading" ? <p className="mt-2 text-sm text-muted">Cargando…</p> : feed ? (
                <div data-feed-origin={feed.origin} className="mt-3 flex gap-3 overflow-x-auto pb-2">
                  {feedItems.map(({ i, k }) => <BigFeedCard key={i.link} item={i} kind={k} />)}
                </div>
              ) : <p className="mt-2 text-sm text-muted">Sin novedades por ahora.</p>}
            </section>
            <Projects projects={projects} onOpen={onOpen} refresh={refresh} />
          </>
        ) : null}
        {section === "plantillas" ? (
          <section>
            <h1 className="text-xl font-bold text-white">Plantillas</h1>
            <p className="mt-1 text-sm text-[#8A8A9A]">Elige un formato y empieza con el ejemplo (título, fondo animado y música) o vacío.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {(["9:16", "16:9", "1:1", "4:5"] as AspectId[]).map((a) => (
                <button key={a} type="button" data-template-aspect={a} onClick={() => void createProject(`Plantilla ${a}`, a, "ejemplo").then((m) => onOpen(m))} className="flex flex-col items-center gap-2 rounded-xl border border-[#23232F] bg-[#15151F] p-5 hover:border-[#D4AF37]/60">
                  <span className="grid h-12 place-items-center" style={{ color: GOLD }}><AspectBox aspect={a} className="scale-150" /></span>
                  <span className="text-sm font-semibold text-white">{a}</span>
                  <span className="text-xs text-[#8A8A9A]">{ASPECT_USE[a]}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
        {section === "andromeda" ? (
          <section data-andromeda="">
            <div className="mb-2 flex items-center gap-3">
              <img src={`${BASE}brand/lockup.png`} alt="Andromeda Music" className="h-10 w-auto" />
              <h1 className="text-xl font-bold text-white">Andromeda</h1>
            </div>
            <FullFeed state={feed} />
          </section>
        ) : null}
        {section === "biblioteca" ? <Projects projects={projects} onOpen={onOpen} refresh={refresh} title="Biblioteca · todos los proyectos" /> : null}
      </main>
      {creating ? (
        <NewProjectDialog
          onClose={() => setCreating(null)}
          onCreate={(aspect, template, name) => void createProject(name, aspect, template).then((meta) => { setCreating(null); onOpen(meta); })}
        />
      ) : null}
      <SettingsDialog />
      <ConnectGrokWizard />
    </div>
  );
}
