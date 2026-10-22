// "Iniciar sesión con Grok": OAuth 2.0 de xAI desde el proceso main.
// - Loopback + PKCE en 127.0.0.1 (primero) y código de dispositivo RFC 8628 (respaldo).
// - Tokens cifrados con safeStorage en userData/xai-session.bin. Nunca se registran ni salen
//   de este proceso; solo viajan a auth.x.ai (renovación) y api.x.ai (llamadas de IA).
// - xAI ROTA el refresh token en cada uso: la renovación es de un solo vuelo y el par nuevo se
//   guarda en disco ANTES de usarse.
// - El client_id NO viene incluido: ver docs/RELEASE.md → "IA: client_id de xAI".
const { app, safeStorage, shell, ipcMain } = require("electron");
const crypto = require("crypto");
const http = require("http");
const fs = require("fs");
const path = require("path");

const DEFAULTS = {
  issuer: "https://auth.x.ai",
  apiBase: "https://api.x.ai",
  scope: "openid profile email offline_access api:access",
  port: 56121,
  clientId: "",
};

function loadConfig() {
  const cfg = { ...DEFAULTS };
  for (const file of [path.join(__dirname, "xai-oauth.json"), path.join(app.getPath("userData"), "xai-oauth.json")]) {
    try {
      Object.assign(cfg, JSON.parse(fs.readFileSync(file, "utf8")));
    } catch {
      /* opcional */
    }
  }
  if (process.env.AVC_XAI_CLIENT_ID) cfg.clientId = process.env.AVC_XAI_CLIENT_ID;
  if (process.env.AVC_XAI_ISSUER) cfg.issuer = process.env.AVC_XAI_ISSUER; // solo pruebas
  if (process.env.AVC_XAI_API_BASE) cfg.apiBase = process.env.AVC_XAI_API_BASE; // solo pruebas
  if (process.env.AVC_XAI_PORT) cfg.port = Number(process.env.AVC_XAI_PORT);
  return cfg;
}

const NO_SUB =
  "Tu cuenta de Grok no tiene una suscripción activa (SuperGrok, X Premium+ o X Subscription). Suscríbete en x.ai para usar la IA.";
const OFFLINE = "No hay conexión a internet (o no se pudo llegar a Grok). Revisa tu red y vuelve a intentar.";
const UA = `AndromedaVideoCut/${app.getVersion()} (Electron)`;

const b64url = (buf) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const sessionFile = () => path.join(app.getPath("userData"), "xai-session.bin");

let session = null; // { access_token, refresh_token, expires_at, name }
let refreshing = null;
let pending = null; // { cancel() }

// Windows usa DPAPI (siempre disponible). Solo las pruebas en Linux sin llavero usan el modo de texto.
function ensureCrypto() {
  if (!safeStorage.isEncryptionAvailable() && process.env.AVC_XAI_ISSUER && safeStorage.setUsePlainTextEncryption) {
    safeStorage.setUsePlainTextEncryption(true);
  }
}

function readSession() {
  ensureCrypto();
  try {
    const buf = fs.readFileSync(sessionFile());
    const json = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(buf) : null;
    session = json ? JSON.parse(json) : null;
  } catch {
    session = null;
  }
}
function writeSession(s) {
  session = s;
  if (!s) {
    fs.rmSync(sessionFile(), { force: true });
    return;
  }
  if (!safeStorage.isEncryptionAvailable()) throw new Error("Este equipo no permite guardar la sesión cifrada.");
  const tmp = `${sessionFile()}.tmp`;
  fs.writeFileSync(tmp, safeStorage.encryptString(JSON.stringify(s)), { mode: 0o600 });
  fs.renameSync(tmp, sessionFile());
}

function nameFromIdToken(idToken) {
  try {
    const p = JSON.parse(Buffer.from(String(idToken).split(".")[1], "base64url").toString("utf8"));
    return p.name || p.preferred_username || p.email || "";
  } catch {
    return "";
  }
}

async function form(url, params) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", "User-Agent": UA },
    body: new URLSearchParams(params).toString(),
  });
  let body = {};
  try {
    body = await res.json();
  } catch {
    /* vacío */
  }
  return { status: res.status, body };
}

async function storeTokens(cfg, tok) {
  let name = nameFromIdToken(tok.id_token);
  if (!name) {
    try {
      const r = await fetch(`${cfg.issuer}/oauth2/userinfo`, { headers: { Authorization: `Bearer ${tok.access_token}`, "User-Agent": UA } });
      if (r.ok) {
        const u = await r.json();
        name = u.name || u.preferred_username || u.email || "";
      }
    } catch {
      /* opcional */
    }
  }
  writeSession({
    access_token: tok.access_token,
    refresh_token: tok.refresh_token || session?.refresh_token || "",
    expires_at: Date.now() + (Number(tok.expires_in) || 3600) * 1000,
    name: name || session?.name || "",
  });
}

/** Comprueba la suscripción con una llamada barata. 401/403 → sin suscripción: se cierra la sesión. */
async function verifySubscription(cfg) {
  try {
    const r = await apiFetch(cfg, { method: "GET", path: "/v1/models" });
    if (r.status === 401 || r.status === 402 || r.status === 403) {
      writeSession(null);
      return { ok: false, kind: "no-subscription", message: NO_SUB };
    }
    if (r.status === 0) return { ok: false, kind: "offline", message: OFFLINE };
    return { ok: true, name: session?.name || "" };
  } catch {
    return { ok: false, kind: "offline", message: OFFLINE };
  }
}

function loginLoopback(cfg) {
  return new Promise((resolve) => {
    const verifier = b64url(crypto.randomBytes(32));
    const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
    const state = b64url(crypto.randomBytes(16));
    const redirect = `http://127.0.0.1:${cfg.port}/callback`;
    let done = false;
    const finish = (r) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      server.close();
      pending = null;
      resolve(r);
    };
    const page = (title, text) =>
      `<!doctype html><meta charset="utf-8"><title>AndromedaVideoCut</title><body style="font-family:sans-serif;background:#0c0c0e;color:#eee;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><h1 style="color:#00d4c8">${title}</h1><p>${text}</p></div></body>`;
    const server = http.createServer(async (req, res) => {
      const u = new URL(req.url, redirect);
      if (u.pathname !== "/callback") {
        res.writeHead(404).end();
        return;
      }
      if (u.searchParams.get("state") !== state) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" }).end(page("Algo salió mal", "Vuelve a AndromedaVideoCut e inténtalo otra vez."));
        return;
      }
      if (u.searchParams.get("error")) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(page("Acceso no aprobado", "Puedes cerrar esta pestaña."));
        finish({ ok: false, kind: "denied", message: "No aprobaste el acceso en Grok. Puedes intentarlo otra vez cuando quieras." });
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(page("¡Listo!", "Ya puedes cerrar esta pestaña y volver a AndromedaVideoCut."));
      try {
        const t = await form(`${cfg.issuer}/oauth2/token`, {
          grant_type: "authorization_code",
          code: u.searchParams.get("code") || "",
          redirect_uri: redirect,
          client_id: cfg.clientId,
          code_verifier: verifier,
        });
        if (t.status !== 200 || !t.body.access_token) {
          finish({ ok: false, kind: t.status === 403 ? "no-subscription" : "other", message: t.status === 403 ? NO_SUB : "Grok no completó el inicio de sesión. Inténtalo otra vez." });
          return;
        }
        await storeTokens(cfg, t.body);
        finish(await verifySubscription(cfg));
      } catch {
        finish({ ok: false, kind: "offline", message: OFFLINE });
      }
    });
    server.on("error", () =>
      finish({ ok: false, kind: "port-busy", message: "Otra app está usando el puerto de inicio de sesión. Toca “Conéctate con un código”." }),
    );
    const timer = setTimeout(() => finish({ ok: false, kind: "timeout", message: "Pasó mucho tiempo sin aprobar. Inténtalo otra vez." }), 10 * 60 * 1000);
    pending = { cancel: () => finish({ ok: false, kind: "cancelled", message: "" }) };
    server.listen(cfg.port, "127.0.0.1", () => {
      const auth = new URL(`${cfg.issuer}/oauth2/authorize`);
      auth.search = new URLSearchParams({
        response_type: "code",
        client_id: cfg.clientId,
        redirect_uri: redirect,
        scope: cfg.scope,
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
      }).toString();
      openBrowser(auth.toString());
    });
  });
}

let device = null;
async function deviceStart(cfg) {
  try {
    const r = await form(`${cfg.issuer}/oauth2/device/code`, { client_id: cfg.clientId, scope: cfg.scope });
    if (r.status !== 200 || !r.body.device_code) return { ok: false, message: "No se pudo pedir el código a Grok. Inténtalo otra vez." };
    device = { ...r.body, cancelled: false, deadline: Date.now() + (Number(r.body.expires_in) || 600) * 1000 };
    const uri = r.body.verification_uri_complete || r.body.verification_uri;
    openBrowser(uri);
    return { ok: true, userCode: r.body.user_code, verificationUri: r.body.verification_uri };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}
async function deviceWait(cfg) {
  const d = device;
  if (!d) return { ok: false, kind: "other", message: "Primero pide un código." };
  let interval = Math.max(1, Number(d.interval) || 5) * 1000;
  pending = { cancel: () => (d.cancelled = true) };
  while (Date.now() < d.deadline && !d.cancelled) {
    await new Promise((r) => setTimeout(r, interval));
    if (d.cancelled) break;
    let r;
    try {
      r = await form(`${cfg.issuer}/oauth2/token`, { grant_type: "urn:ietf:params:oauth:grant-type:device_code", client_id: cfg.clientId, device_code: d.device_code });
    } catch {
      continue;
    }
    if (r.status === 200 && r.body.access_token) {
      pending = null;
      await storeTokens(cfg, r.body);
      return verifySubscription(cfg);
    }
    if (r.body.error === "authorization_pending") continue;
    if (r.body.error === "slow_down") {
      interval += 5000;
      continue;
    }
    pending = null;
    if (r.body.error === "access_denied") return { ok: false, kind: "denied", message: "No aprobaste el acceso en Grok. Puedes intentarlo otra vez cuando quieras." };
    if (r.status === 403) return { ok: false, kind: "no-subscription", message: NO_SUB };
    return { ok: false, kind: "timeout", message: "El código venció. Inténtalo otra vez." };
  }
  pending = null;
  return d.cancelled ? { ok: false, kind: "cancelled", message: "" } : { ok: false, kind: "timeout", message: "El código venció. Inténtalo otra vez." };
}

/** Renovación de un solo vuelo. El refresh token rota: se guarda el par nuevo antes de usarlo. */
function refresh(cfg) {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      if (!session?.refresh_token) return false;
      const r = await form(`${cfg.issuer}/oauth2/token`, { grant_type: "refresh_token", refresh_token: session.refresh_token, client_id: cfg.clientId });
      if (r.status === 200 && r.body.access_token) {
        await storeTokens(cfg, r.body);
        return true;
      }
      if (r.status === 400 || r.status === 401) writeSession(null); // invalid_grant: hay que volver a entrar
      return false;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function apiFetch(cfg, init) {
  if (!session?.access_token) return { status: -1, body: "" };
  if (Date.now() > session.expires_at - 5 * 60 * 1000) await refresh(cfg);
  const send = async () => {
    const headers = { Authorization: `Bearer ${session.access_token}`, "User-Agent": UA };
    let body;
    if (init.json !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(init.json);
    } else if (init.wav) {
      body = new FormData();
      for (const [k, v] of Object.entries(init.fields || {})) body.append(k, v);
      body.append("file", new Blob([Buffer.from(init.wav)], { type: "audio/wav" }), "audio.wav");
    }
    const res = await fetch(`${cfg.apiBase}${init.path}`, { method: init.method, headers, body });
    // Límites reales que xAI manda en cabeceras (por minuto). No hay cuota semanal pública para cuentas Grok.
    const limits = {};
    for (const k of ["x-ratelimit-limit-requests", "x-ratelimit-remaining-requests", "x-ratelimit-reset-requests", "x-ratelimit-limit-tokens", "x-ratelimit-remaining-tokens", "x-ratelimit-reset-tokens"]) {
      const v = res.headers.get(k);
      if (v != null) limits[k] = v;
    }
    return { status: res.status, body: await res.text(), limits };
  };
  if (!session?.access_token) return { status: -1, body: "" };
  try {
    let r = await send();
    if (r.status === 401 && (await refresh(cfg)) && session) r = await send();
    if (r.status === 401 || r.status === 403) writeSession(null); // sin suscripción o sesión inválida: queda bloqueado
    return { status: r.status, body: r.body.slice(0, 200_000), limits: r.limits || {} };
  } catch {
    return { status: 0, body: "" };
  }
}

const ALLOWED_PATH = /^\/v1\/(models|stt|videos\/generations|videos\/[A-Za-z0-9-]{8,80})$/;

let openBrowser = (url) => shell.openExternal(url);

function registerXaiIpc({ testBrowser } = {}) {
  if (testBrowser) openBrowser = testBrowser;
  readSession();
  ipcMain.handle("ai:status", () => {
    const cfg = loadConfig();
    return { connected: Boolean(session?.access_token), name: session?.name || "", configured: Boolean(cfg.clientId) };
  });
  ipcMain.handle("ai:login", () => {
    const cfg = loadConfig();
    if (!cfg.clientId) return { ok: false, kind: "not-configured", message: "El inicio de sesión con Grok todavía no está habilitado en esta versión." };
    pending?.cancel();
    return loginLoopback(cfg);
  });
  ipcMain.handle("ai:device-start", () => {
    const cfg = loadConfig();
    if (!cfg.clientId) return { ok: false, message: "El inicio de sesión con Grok todavía no está habilitado en esta versión." };
    return deviceStart(cfg);
  });
  ipcMain.handle("ai:device-wait", () => deviceWait(loadConfig()));
  ipcMain.handle("ai:cancel", () => pending?.cancel());
  ipcMain.handle("ai:logout", async () => {
    const cfg = loadConfig();
    const rt = session?.refresh_token;
    writeSession(null);
    if (rt && cfg.clientId) form(`${cfg.issuer}/oauth2/revoke`, { token: rt, token_type_hint: "refresh_token", client_id: cfg.clientId }).catch(() => {});
  });
  ipcMain.handle("ai:request", (_e, init) => {
    if (!init || !ALLOWED_PATH.test(String(init.path)) || !["GET", "POST"].includes(init.method)) return { status: 400, body: "" };
    return apiFetch(loadConfig(), init);
  });
  ipcMain.handle("ai:download", async (_e, url) => {
    try {
      const u = new URL(String(url));
      const cfg = loadConfig();
      const okHost = u.protocol === "https:" && (u.hostname === "x.ai" || u.hostname.endsWith(".x.ai"));
      const testHost = process.env.AVC_XAI_API_BASE && url.startsWith(cfg.apiBase);
      if (!okHost && !testHost) return { status: 400 };
      const r = await fetch(u, { headers: { "User-Agent": UA } }); // el archivo del clip no lleva el token
      if (!r.ok) return { status: r.status };
      const buf = await r.arrayBuffer();
      if (buf.byteLength > 60_000_000) return { status: 413 };
      return { status: 200, data: buf };
    } catch {
      return { status: 0 };
    }
  });
}

module.exports = { registerXaiIpc, loadConfig };
