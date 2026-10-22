// Servidor falso de auth.x.ai + api.x.ai. MODE: ok | nosub. Registra lo que recibe en /log.
const http = require("http"); const crypto = require("crypto");
const MODE = process.env.MODE || "ok"; const PORT = Number(process.env.PORT || 18555);
const log = []; let codes = {}; let rt = "rt-1"; let deviceApproved = false;
const idt = "x." + Buffer.from(JSON.stringify({ name: "Wilhelm Prueba" })).toString("base64url") + ".x";
const tok = () => { rt = "rt-" + crypto.randomBytes(3).toString("hex"); return { access_token: "at-" + rt, refresh_token: rt, expires_in: 21600, id_token: idt, token_type: "Bearer" }; };
http.createServer((req, res) => {
  let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => {
    const u = new URL(req.url, "http://x"); const p = new URLSearchParams(b);
    log.push({ m: req.method, path: u.pathname, auth: req.headers.authorization ? "Bearer …" : "", grant: p.get("grant_type") || "" });
    const j = (s, o) => { res.writeHead(s, { "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };
    if (u.pathname === "/log") return j(200, log);
    if (u.pathname === "/approve") { deviceApproved = true; return j(200, {}); }
    if (u.pathname === "/oauth2/authorize") {
      const q = u.searchParams; const code = "c" + Math.random(); codes[code] = q.get("code_challenge");
      res.writeHead(302, { Location: `${q.get("redirect_uri")}?code=${code}&state=${q.get("state")}` }); return res.end();
    }
    if (u.pathname === "/oauth2/device/code") return j(200, { device_code: "dc", user_code: "ABCD-1234", verification_uri: `http://127.0.0.1:${PORT}/device`, interval: 1, expires_in: 60 });
    if (u.pathname === "/oauth2/token") {
      const g = p.get("grant_type");
      if (g === "authorization_code") {
        const ch = crypto.createHash("sha256").update(p.get("code_verifier")).digest("base64url");
        if (codes[p.get("code")] !== ch) return j(400, { error: "invalid_grant" }); return j(200, tok());
      }
      if (g.endsWith("device_code")) return deviceApproved ? j(200, tok()) : j(400, { error: "authorization_pending" });
      if (g === "refresh_token") return p.get("refresh_token") === rt ? j(200, tok()) : j(400, { error: "invalid_grant" });
    }
    if (u.pathname === "/oauth2/revoke") return j(200, {});
    if (u.pathname.startsWith("/v1/")) {
      if (MODE === "nosub") return j(403, { error: "no subscription" });
      if (u.pathname === "/v1/models") return j(200, { data: [{ id: "grok" }] });
    }
    j(404, {});
  });
}).listen(PORT, "127.0.0.1", () => console.log("mock listo", MODE));
