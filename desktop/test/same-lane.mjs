// 0.0.6 · 1b: el MISMO canal sirve para agregar, copiar/pegar y duplicar (videos, stickers, textos, filtros, efectos, audios).
// Funciona en web (Playwright page) y PC (Electron window): export async function run(pg, ok)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const S = (pg) => pg.evaluate(() => { const s = window.__avcEditor.getState(); return { clips: s.clips.map((c) => ({ id: c.id, type: c.type, trackId: c.trackId, start: c.start, duration: c.duration })), order: [...s.trackOrder], sel: s.selectedId }; });
async function row(pg, track) {
  return pg.evaluate((t) => { const els = [...document.querySelectorAll(`[data-timeline] div[data-track="${t}"]`)].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 200); const r = els.sort((a, b) => b.width - a.width)[0]; return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null; }, track);
}
async function xAt(pg, t) { return pg.evaluate((t) => { const s = window.__avcEditor.getState(); const el = document.querySelector("[data-timeline] [data-clip]")?.parentElement; const box = [...document.querySelectorAll("[data-timeline] div[data-track]")].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 200)[0]; const sc = document.querySelector("[data-timeline] [data-ruler]")?.parentElement; return box.x + t * s.pps - (document.querySelector("[data-timeline] .overflow-x-auto, [data-timeline] .overflow-auto")?.scrollLeft || 0); }, t); }
async function drag(pg, from, x, y) {
  await from.scrollIntoViewIfNeeded().catch(() => {}); await sleep(100);
  const b = await from.boundingBox(); const sx = b.x + b.width / 2, sy = b.y + b.height / 2;
  await pg.mouse.move(sx, sy); await pg.mouse.down();
  for (let i = 1; i <= 18; i++) await pg.mouse.move(sx + (x - sx) * i / 18, sy + (y - sy) * i / 18);
  if (process.env.DBG) await pg.evaluate(() => { window.__dbgLane = []; });
  await sleep(150); if (process.env.DBG) console.log("DROP", Math.round(x), Math.round(y), JSON.stringify(await pg.evaluate(([x, y]) => { const s = document.querySelector("[data-timeline] .lanes [data-insert]"); const e = document.elementFromPoint(x, y); const a1 = [...document.querySelectorAll("[data-timeline] .lanes [data-track]")].map((e) => [e.dataset.track, Math.round(e.getBoundingClientRect().top), Math.round(e.getBoundingClientRect().bottom)]); const sc = document.querySelector("[data-timeline] .lanes").parentElement.parentElement; return { rows: JSON.stringify(a1), view: [Math.round(sc.getBoundingClientRect().top), sc.clientHeight, sc.scrollTop, sc.scrollHeight, sc.className.slice(0, 60)], slot: s ? [s.getAttribute("data-insert-mode"), s.getAttribute("data-insert-anchor"), Math.round(s.getBoundingClientRect().top)] : null, el: e?.closest("[data-track]")?.getAttribute("data-track"), tag: document.querySelector("[data-cursor-tag]")?.textContent }; }, [x, y])));
  await pg.mouse.up(); await sleep(400); if (process.env.DBG) console.log("LANES", (await pg.evaluate(() => window.__dbgLane || [])).slice(-6).join(" | "));
}
const KINDS = [
  ["media", "asset:", "v1"], ["media", "generator:", "v1"], ["stickers", "sticker:", "o1"], ["text", "text:", "t1"], ["filters", "grade:", "fx1"], ["filters", "filter:", "fx1"], ["effects", "effect:", "fx1"], ["audio", "audio:", "a1"],
];
export async function run(pg, ok, { tag = "" } = {}) {
  const results = [];
  for (const [tool, prefix, lane] of KINDS) {
    await pg.evaluate((t) => window.__avcEditor.getState().setTool(t), tool); await sleep(300);
    const items = pg.locator(`[data-lib-item^="${prefix}"]:not([data-lib-item$=":none"]):visible`);
    if ((await items.count()) === 0) { ok(`${tag}${prefix} hay elementos en la biblioteca`, false); continue; }
    // 1) primer elemento: soltar al inicio de la línea de tiempo (zona vacía de abajo)
    await pg.evaluate(() => { window.__avcEditor.getState().clearTimeline(); window.__avcSeek?.(0); }); await sleep(300);
    const anyRow = await row(pg, lane);
    const tl = await pg.locator("[data-timeline]").boundingBox();
    await drag(pg, items.first(), anyRow.x + 40, anyRow.y + anyRow.h / 2);
    let st = await S(pg); const a = st.clips[st.clips.length - 1];
    if (!a) { ok(`${tag}${prefix} primer elemento entra en ${lane}`, false, await pg.evaluate(() => window.__avcEditor.getState().notice)); continue; }
    const tracks0 = st.order.length, T = a.trackId;
    const r = await row(pg, T);
    const pps = await pg.evaluate(() => window.__avcEditor.getState().pps);
    const x0 = r.x - a.start * pps + 0; // x del segundo 0 en la fila
    // 2) segundo elemento en hueco libre (después del final)
    await drag(pg, items.nth((await items.count()) > 1 ? 1 : 0), x0 + (a.start + a.duration + 1.5) * pps, r.y + r.h / 2);
    st = await S(pg); const b = st.clips.find((c) => !c.id || c.id !== a.id && !results.includes(c.id) && c.id !== a.id && st.clips.indexOf(c) === st.clips.length - 1);
    ok(`${tag}${prefix} soltar en hueco libre de la misma pista la usa`, b && b.trackId === T && st.order.length === tracks0, JSON.stringify({ T, got: b?.trackId, tracks: [tracks0, st.order.length] }));
    // 3) tercero encima del primero (solapa): misma pista, siguiente hueco
    await drag(pg, items.first(), x0 + (a.start + a.duration / 2) * pps, r.y + r.h / 2);
    st = await S(pg); const c = st.clips[st.clips.length - 1];
    const overlap = st.clips.filter((k) => k.trackId === T && k.id !== c.id).some((k) => c.start < k.start + k.duration - 0.01 && c.start + c.duration > k.start + 0.01);
    ok(`${tag}${prefix} soltar encima de otro: misma pista, sin solapar`, c.trackId === T && !overlap && st.order.length === tracks0, JSON.stringify({ got: c.trackId, start: c.start.toFixed(2), overlap }));
    // 4) copiar / pegar en el cabezal
    await pg.evaluate((id) => { const s = window.__avcEditor.getState(); s.select(id); s.copySelected(); window.__avcSeek?.(0.2); }, a.id); await sleep(200);
    await pg.evaluate(() => window.__avcEditor.getState().pasteClipboard()); await sleep(200);
    st = await S(pg); const p = st.clips.find((k) => k.id === st.sel);
    const pOverlap = st.clips.filter((k) => k.trackId === T && k.id !== p.id).some((k) => p.start < k.start + k.duration - 0.01 && p.start + p.duration > k.start + 0.01);
    ok(`${tag}${prefix} copiar/pegar queda en la misma pista sin solapar`, p.trackId === T && !pOverlap && st.order.length === tracks0, JSON.stringify({ got: p.trackId, start: p.start.toFixed(2) }));
    // 5) duplicar: misma pista, después del clip
    await pg.evaluate((id) => { const s = window.__avcEditor.getState(); s.select(id); s.duplicateSelected(); }, a.id); await sleep(200);
    st = await S(pg); const d = st.clips.find((k) => k.id === st.sel);
    ok(`${tag}${prefix} duplicar queda en la misma pista, después`, d && d.id !== a.id && d.trackId === T && d.start >= a.start + a.duration - 0.01 && st.order.length === tracks0, JSON.stringify({ got: d?.trackId, start: d?.start?.toFixed(2), aEnd: (a.start + a.duration).toFixed(2) }));
  }
}
