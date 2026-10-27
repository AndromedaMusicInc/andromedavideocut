import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { describePlatform, feedbackBody, feedbackSubject, githubIssueUrl, mailtoUrl, validEmail } from "./feedback.ts";

const f = { kind: "sugerencia" as const, text: "Quiero más transiciones & efectos?", email: "yo@x.com", version: "0.0.6", platform: "PC (Windows)" };
describe("buzón de sugerencias", () => {
  it("asunto con versión y tipo", () => {
    assert.equal(feedbackSubject(f), "[AndromedaVideoCut 0.0.6] Sugerencia");
    assert.equal(feedbackSubject({ ...f, kind: "bug" }), "[AndromedaVideoCut 0.0.6] Bug");
  });
  it("cuerpo con texto, tipo, versión, plataforma y contacto", () => {
    const b = feedbackBody(f);
    for (const s of ["Quiero más transiciones", "Tipo: Sugerencia", "Versión: 0.0.6", "Plataforma: PC (Windows)", "Contacto: yo@x.com"]) assert.ok(b.includes(s), s);
    assert.ok(feedbackBody({ ...f, email: "" }).includes("Contacto: (no indicado)"));
  });
  it("mailto a info@ con todo codificado", () => {
    const u = mailtoUrl(f);
    assert.ok(u.startsWith("mailto:info@andromedamusicinc.com?subject="));
    const q = new URLSearchParams(u.split("?")[1]);
    assert.equal(q.get("subject"), "[AndromedaVideoCut 0.0.6] Sugerencia");
    assert.ok(q.get("body")!.includes("& efectos?"));
  });
  it("issue de GitHub prellenado, sin el correo (privacidad), con etiqueta", () => {
    const u = new URL(githubIssueUrl(f));
    assert.equal(u.origin + u.pathname, "https://github.com/AndromedaMusicInc/andromedavideocut/issues/new");
    assert.equal(u.searchParams.get("title"), "[AndromedaVideoCut 0.0.6] Sugerencia");
    assert.ok(!u.searchParams.get("body")!.includes("yo@x.com"));
    assert.equal(u.searchParams.get("labels"), "enhancement");
    assert.equal(new URL(githubIssueUrl({ ...f, kind: "bug" })).searchParams.get("labels"), "bug");
  });
  it("correo opcional pero válido", () => {
    assert.ok(validEmail("")); assert.ok(validEmail("a@b.co")); assert.ok(!validEmail("nope"));
  });
  it("plataforma", () => {
    assert.equal(describePlatform("Mozilla/5.0 (Windows NT 10.0) Chrome/140 Electron/45", true), "PC (Windows)");
    assert.equal(describePlatform("Mozilla/5.0 (X11; Linux x86_64) Chrome/140 Safari/537", false), "Web (Chrome · Linux)");
  });
});
