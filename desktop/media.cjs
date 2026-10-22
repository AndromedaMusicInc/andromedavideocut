// 0.0.3: medios en la app de PC. ffprobe para saber qué es cada archivo, proxies de edición con ffmpeg (LGPL,
// incluido en el instalador) para lo que Chromium no puede decodificar, REDline (si está instalado) para RED R3D
// y Nikon N-RAW, y un registro de importación (userData/logs/medios.log) para soporte.
const { app, ipcMain, shell } = require("electron");
const { spawn, execFile } = require("child_process");
const fs = require("fs");
const path = require("path");

const EXE = process.platform === "win32" ? ".exe" : "";
function ffDir() {
  if (process.env.AVC_FFMPEG_DIR) return process.env.AVC_FFMPEG_DIR;
  if (app.isPackaged) return path.join(process.resourcesPath, "ffmpeg");
  return path.join(__dirname, "vendor", "ffmpeg", process.platform === "win32" ? "win" : "linux", "bin");
}
const ffmpegPath = () => path.join(ffDir(), `ffmpeg${EXE}`);
const ffprobePath = () => path.join(ffDir(), `ffprobe${EXE}`);
const hasFfmpeg = () => fs.existsSync(ffmpegPath()) && fs.existsSync(ffprobePath());
const proxyDir = () => path.join(app.getPath("userData"), "proxies");
const logFile = () => path.join(app.getPath("userData"), "logs", "medios.log");

function log(entry) {
  try {
    fs.mkdirSync(path.dirname(logFile()), { recursive: true });
    fs.appendFileSync(logFile(), `${new Date().toISOString()} ${JSON.stringify(entry)}\n`);
  } catch {
    /* sin disco */
  }
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    execFile(cmd, args, { maxBuffer: 16 * 1024 * 1024, windowsHide: true, ...opts }, (err, stdout, stderr) => resolve({ err, stdout: String(stdout), stderr: String(stderr) }));
  });
}

/** Resumen de ffprobe: contenedor, códecs, perfil, bits, tamaño, rotación, duración. */
async function probe(file) {
  if (!hasFfmpeg()) return { ok: false, error: "ffmpeg no está instalado con la app" };
  const r = await run(ffprobePath(), ["-v", "error", "-show_format", "-show_streams", "-of", "json", file]);
  if (r.err) return { ok: false, error: (r.stderr || String(r.err)).trim().split("\n").pop().slice(0, 300) };
  try {
    const j = JSON.parse(r.stdout);
    const v = (j.streams || []).find((s) => s.codec_type === "video" && !(s.disposition && s.disposition.attached_pic));
    const a = (j.streams || []).find((s) => s.codec_type === "audio");
    const rot = v && (v.side_data_list || []).find((d) => d.rotation !== undefined);
    return {
      ok: true,
      container: j.format?.format_name || "",
      containerLong: j.format?.format_long_name || "",
      duration: Number(j.format?.duration) || Number(v?.duration) || 0,
      size: Number(j.format?.size) || 0,
      video: v ? { codec: v.codec_name, tag: v.codec_tag_string, profile: v.profile || "", pixFmt: v.pix_fmt || "", bits: Number(v.bits_per_raw_sample) || (/(10|12)(le|be)/.exec(v.pix_fmt || "") ? Number(/(10|12)/.exec(v.pix_fmt)[1]) : 8), width: v.width, height: v.height, fps: v.avg_frame_rate, rotation: rot ? rot.rotation : 0 } : null,
      audio: a ? { codec: a.codec_name, channels: a.channels, rate: Number(a.sample_rate) } : null,
    };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

let encoders = null;
async function listEncoders() {
  if (encoders) return encoders;
  const r = await run(ffmpegPath(), ["-hide_banner", "-encoders"]);
  encoders = new Set([...r.stdout.matchAll(/^\s*V\S*\s+(\S+)/gm)].map((m) => m[1]));
  return encoders;
}

/** Candidatos de códec del proxy, en orden. H.264 por GPU (NVIDIA/Intel/AMD), OpenH264 y, si todo falla, VP9. */
async function proxyPlans() {
  const enc = await listEncoders();
  const plans = [];
  const h264 = (codec, extra) => ({ name: codec, ext: "mp4", v: ["-c:v", codec, ...extra], a: ["-c:a", "aac", "-b:a", "160k"], mux: ["-movflags", "+faststart"] });
  if (process.env.AVC_PROXY_CODEC !== "vp9") {
    if (enc.has("h264_nvenc")) plans.push(h264("h264_nvenc", ["-preset", "p4", "-b:v", "6M"]));
    if (enc.has("h264_qsv")) plans.push(h264("h264_qsv", ["-b:v", "6M"]));
    if (enc.has("h264_amf")) plans.push(h264("h264_amf", ["-b:v", "6M"]));
    if (enc.has("libopenh264")) plans.push(h264("libopenh264", ["-b:v", "6M", "-allow_skip_frames", "0"]));
  }
  if (enc.has("libvpx-vp9")) plans.push({ name: "libvpx-vp9", ext: "webm", v: ["-c:v", "libvpx-vp9", "-deadline", "realtime", "-cpu-used", "8", "-row-mt", "1", "-b:v", "4M"], a: ["-c:a", "libopus", "-b:a", "160k"], mux: [] });
  return plans;
}

const jobs = new Map();
function ffmpegProxy(id, input, duration, onProgress) {
  return (async () => {
    fs.mkdirSync(proxyDir(), { recursive: true });
    const plans = await proxyPlans();
    let lastErr = "no hay códec para el proxy";
    for (const plan of plans) {
      const out = path.join(proxyDir(), `${id}.${plan.ext}`);
      const args = ["-hide_banner", "-y", "-nostdin", "-i", input, "-map", "0:v:0", "-map", "0:a:0?", "-vf", "scale=-2:'min(1080,ih)':flags=bicubic,format=yuv420p", "-fps_mode", "cfr", ...plan.v, ...plan.a, "-ac", "2", ...plan.mux, "-progress", "pipe:1", "-nostats", out];
      const res = await new Promise((resolve) => {
        const p = spawn(ffmpegPath(), args, { windowsHide: true });
        jobs.set(id, p);
        let err = "";
        p.stdout.on("data", (d) => {
          const m = /out_time_us=(\d+)/.exec(String(d));
          if (m && duration > 0) onProgress(Math.min(99, Math.round((Number(m[1]) / 1e6 / duration) * 100)));
        });
        p.stderr.on("data", (d) => (err = (err + d).slice(-2000)));
        p.on("close", (code) => resolve({ code, err }));
        p.on("error", (e) => resolve({ code: -1, err: String(e) }));
      });
      jobs.delete(id);
      if (res.code === 0 && fs.existsSync(out) && fs.statSync(out).size > 0) return { ok: true, path: out, codec: plan.name, mime: plan.ext === "mp4" ? "video/mp4" : "video/webm" };
      lastErr = `${plan.name}: ${res.err.trim().split("\n").slice(-2).join(" ")}`;
      try { fs.rmSync(out, { force: true }); } catch { /* */ }
      if (res.code === null) return { ok: false, error: "cancelado" };
    }
    return { ok: false, error: lastErr.slice(0, 400) };
  })();
}

/** REDline (REDCINE-X PRO): lo instala el usuario; nosotros solo lo usamos si existe. */
function findRedline() {
  const c = [process.env.AVC_REDLINE, "C:\\Program Files\\REDCINE-X PRO 64-bit\\REDline.exe", "/Applications/REDCINE-X Professional/REDCINE-X PRO.app/Contents/MacOS/REDline", "/usr/sbin/REDline", "/usr/local/bin/REDline"].filter(Boolean);
  for (const p of c) if (fs.existsSync(p)) return p;
  for (const dir of String(process.env.PATH || "").split(path.delimiter)) {
    const p = path.join(dir, `REDline${EXE}`);
    if (dir && fs.existsSync(p)) return p;
  }
  return null;
}
async function redlineToMov(id, input) {
  const rl = findRedline();
  if (!rl) return { ok: false, error: "no-redline" };
  const outDir = path.join(proxyDir(), `${id}-red`);
  fs.mkdirSync(outDir, { recursive: true });
  // QuickTime ProRes 422 Proxy a 1/2 de resolución (documentación REDline: --format 11, --QTcodec 32, --res 3).
  const r = await run(rl, ["--i", input, "--o", "clip", "--outDir", outDir, "--format", "11", "--QTcodec", "32", "--res", "3"], { maxBuffer: 64 * 1024 * 1024 });
  const mov = fs.existsSync(outDir) && fs.readdirSync(outDir).find((f) => /\.mov$/i.test(f));
  if (!mov) return { ok: false, error: `REDline: ${(r.stderr || r.stdout || String(r.err)).trim().split("\n").pop()}`.slice(0, 300) };
  return { ok: true, path: path.join(outDir, mov) };
}

function registerMediaIpc(getWin) {
  ipcMain.handle("media:info", () => ({ ffmpeg: hasFfmpeg(), redline: Boolean(findRedline()), log: logFile() }));
  ipcMain.handle("media:probe", (_e, file) => probe(String(file)));
  ipcMain.handle("media:log", (_e, entry) => log(entry));
  ipcMain.handle("media:open-log", () => shell.showItemInFolder(logFile()));
  ipcMain.handle("media:cancel", (_e, id) => { const p = jobs.get(String(id)); if (p) p.kill(); });
  ipcMain.handle("media:proxy", async (e, id, file, opts = {}) => {
    id = String(id).replace(/[^a-z0-9_-]/gi, "");
    let input = String(file);
    const send = (pct) => { try { e.sender.send("media:progress", id, pct); } catch { /* ventana cerrada */ } };
    if (opts.raw) {
      const r = await redlineToMov(id, input);
      if (!r.ok) { log({ evento: "raw", id, file: input, error: r.error }); return r; }
      input = r.path;
    }
    const info = await probe(input);
    const res = await ffmpegProxy(id, input, info.ok ? info.duration : 0, send);
    log({ evento: "proxy", id, file: input, ...res });
    if (res.ok) send(100);
    return res;
  });
  // Audio que Chromium no decodifica → WAV PCM 16-bit 48 kHz estéreo (lo que mejor suena en cualquier tarjeta).
  ipcMain.handle("media:audio", async (_e, id, file) => {
    id = String(id).replace(/[^a-z0-9_-]/gi, "");
    if (!hasFfmpeg()) return { ok: false, error: "ffmpeg no está instalado con la app" };
    const info = await probe(String(file));
    if (info.ok && !info.audio) return { ok: false, error: "sin-audio" };
    fs.mkdirSync(proxyDir(), { recursive: true });
    const out = path.join(proxyDir(), `${id}-audio.wav`);
    const r = await run(ffmpegPath(), ["-hide_banner", "-y", "-nostdin", "-i", String(file), "-map", "0:a:0", "-vn", "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", "-rf64", "auto", out]);
    const ok = !r.err && fs.existsSync(out) && fs.statSync(out).size > 44;
    const res = ok ? { ok: true, path: out } : { ok: false, error: `ffmpeg: ${(r.stderr || "").trim().split("\n").pop()}`.slice(0, 300) };
    log({ evento: "audio-wav", id, file: String(file), entrada: info.ok ? info.audio : null, ...res });
    return res;
  });
  ipcMain.handle("media:read", (_e, p) => {
    const file = path.resolve(String(p));
    if (!file.startsWith(path.resolve(proxyDir()) + path.sep)) return null; // solo proxies propios
    return fs.readFileSync(file);
  });
}

module.exports = { registerMediaIpc, hasFfmpeg, findRedline, logFile, ffDir };
