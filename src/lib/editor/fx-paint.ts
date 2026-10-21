import { recipeOf, type FxRecipe } from "@/lib/editor/fx-catalog";
import { FILTERS, type Grade } from "@/lib/editor/types";

let plate: HTMLCanvasElement | null = null;
const plateListeners = new Set<() => void>();

function ensurePlate(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  if (plate) return plate;
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  if (ctx) drawPlate(ctx, 640, 360);
  plate = canvas;
  const img = new Image();
  img.onload = () => {
    const g = plate?.getContext("2d");
    if (!g || !plate) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, plate.width, plate.height);
    g.drawImage(img, 0, 0, plate.width, plate.height);
    plateListeners.forEach((fn) => fn());
  };
  img.src = `${import.meta.env.BASE_URL}fx-plate.jpg`;
  return plate;
}

export function onPlate(fn: () => void) {
  plateListeners.add(fn);
  return () => {
    plateListeners.delete(fn);
  };
}

function drawPlate(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#14102a");
  sky.addColorStop(0.45, "#1a4058");
  sky.addColorStop(0.62, "#c45a32");
  sky.addColorStop(1, "#120e0c");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#f4efe4";
  ctx.beginPath();
  ctx.arc(w * 0.8, h * 0.16, Math.min(w, h) * 0.045, 0, Math.PI * 2);
  ctx.fill();
  const blocks: [number, number, number, number, string][] = [
    [0.0, 0.34, 0.14, 0.48, "#10131a"],
    [0.12, 0.24, 0.12, 0.58, "#0c1016"],
    [0.24, 0.42, 0.16, 0.4, "#17141e"],
    [0.4, 0.2, 0.14, 0.62, "#121820"],
    [0.54, 0.36, 0.16, 0.46, "#1a1422"],
    [0.7, 0.28, 0.16, 0.54, "#101018"],
    [0.86, 0.4, 0.16, 0.42, "#16141c"],
  ];
  blocks.forEach(([x, y, bw, bh, color], i) => {
    ctx.fillStyle = color;
    ctx.fillRect(x * w, y * h, bw * w, bh * h);
    const cols = 3;
    const rows = 5;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const on = (i * 7 + r * 3 + c) % 5 !== 0;
        if (!on) continue;
        const warm = (i + c) % 3 === 0;
        ctx.fillStyle = warm ? "rgba(255,186,92,0.85)" : "rgba(0,212,200,0.7)";
        const wx = x * w + ((c + 0.4) * bw * w) / cols;
        const wy = y * h + ((r + 0.45) * bh * h) / rows;
        ctx.fillRect(wx, wy, Math.max(2, w * 0.012), Math.max(2, h * 0.018));
      }
    }
  });
  ctx.fillStyle = "#14110f";
  ctx.fillRect(0, h * 0.78, w, h * 0.22);
  ctx.fillStyle = "#e7b48a";
  ctx.beginPath();
  ctx.ellipse(w * 0.46, h * 0.62, w * 0.04, h * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a120e";
  ctx.beginPath();
  ctx.ellipse(w * 0.46, h * 0.59, w * 0.042, h * 0.03, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0e0e12";
  ctx.fillRect(w * 0.4, h * 0.67, w * 0.12, h * 0.2);
  ctx.strokeStyle = "#00d4c8";
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.strokeRect(w * 0.4, h * 0.67, w * 0.12, h * 0.2);
  ctx.fillStyle = "#ff3d8a";
  ctx.fillRect(w * 0.58, h * 0.48, w * 0.06, h * 0.025);
  ctx.fillStyle = "#00d4c8";
  ctx.fillRect(w * 0.22, h * 0.5, w * 0.05, h * 0.02);
}

function rand(t: number, k: number) {
  const x = Math.sin(t * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

let bufA: HTMLCanvasElement | null = null;
let bufB: HTMLCanvasElement | null = null;
let tiny: HTMLCanvasElement | null = null;
let noise: HTMLCanvasElement | null = null;
let noiseFrame = -1;

function scratch(which: 0 | 1, src: CanvasImageSource, w: number, h: number) {
  let slot = which === 0 ? bufA : bufB;
  if (!slot) {
    slot = document.createElement("canvas");
    if (which === 0) bufA = slot;
    else bufB = slot;
  }
  if (slot.width !== w || slot.height !== h) {
    slot.width = w;
    slot.height = h;
  }
  const g = slot.getContext("2d");
  if (!g) return slot;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, w, h);
  g.drawImage(src, 0, 0, w, h);
  return slot;
}

function spatial(r: FxRecipe) {
  return !!(
    r.filter ||
    r.blur ||
    r.hue ||
    r.shake ||
    r.vshake ||
    r.hshake ||
    r.zoom ||
    r.snap ||
    (r.zoomBase && r.zoomBase !== 1) ||
    r.spin ||
    r.pan ||
    r.drift ||
    r.bounce ||
    r.fish ||
    r.stretch ||
    r.pixel ||
    r.tiles ||
    r.mirror ||
    r.slices ||
    r.glitch ||
    r.wave ||
    r.heat ||
    r.whip ||
    r.rgb ||
    r.prism ||
    r.split ||
    r.kaleido
  );
}

function drawPixel(ctx: CanvasRenderingContext2D, shot: CanvasImageSource, w: number, h: number, size: number) {
  if (!tiny) tiny = document.createElement("canvas");
  const cells = Math.max(8, Math.round((size > 1.4 ? 18 : 28) / Math.max(0.4, size / 2)));
  tiny.width = Math.max(8, Math.round(w / cells));
  tiny.height = Math.max(8, Math.round(h / cells));
  const g = tiny.getContext("2d");
  if (!g) return;
  g.imageSmoothingEnabled = true;
  g.drawImage(shot, 0, 0, tiny.width, tiny.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tiny, 0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
}

function drawBands(
  ctx: CanvasRenderingContext2D,
  shot: CanvasImageSource,
  r: FxRecipe,
  w: number,
  h: number,
  t: number,
) {
  const bands = r.glitch ? 8 : r.heat ? 18 : 12;
  const amp = (r.glitch ?? r.wave ?? r.heat ?? r.slices ?? 0.5) * w * (r.glitch ? 0.08 : 0.045);
  for (let i = 0; i < bands; i += 1) {
    const y = (i / bands) * h;
    const bh = h / bands + 1;
    let shift = 0;
    if (r.glitch) {
      const hit = rand(Math.floor(t * 8) / 8, i) > 0.62;
      shift = hit ? (rand(Math.floor(t * 8) / 8, i + 4) - 0.5) * 2 * amp : Math.sin(t * 10 + i) * amp * 0.12;
    } else if (r.heat) shift = Math.sin(t * 7 + i * 0.85) * amp;
    else if (r.wave) shift = Math.sin(t * 2.4 + i * 0.55) * amp;
    else shift = Math.sin(t * 7 + i * 1.3) * amp * (i % 2 === 0 ? 1 : -1);
    ctx.drawImage(shot, 0, y, w, bh, shift, y, w, bh);
  }
}

function drawSpatial(ctx: CanvasRenderingContext2D, shot: CanvasImageSource, r: FxRecipe, w: number, h: number, t: number) {
  const hs = r.hshake ?? r.shake ?? 0;
  const vs = r.vshake ?? r.shake ?? 0;
  const jx = (rand(t * 2.2, 1) - 0.5) * 2 * hs * w * 0.028;
  const jy = (rand(t * 2.2, 2) - 0.5) * 2 * vs * h * 0.028;
  const speed = r.zoomSpeed ?? 5;
  const base = r.zoomBase ?? 1;
  const amp = r.zoom ?? 0;
  const snap = r.snap ? Math.max(0, Math.sin(t * (r.zoomSpeed ?? 8))) ** 2 * (r.snap ?? 0) : amp * Math.sin(t * speed);
  const z = base * (1 + (r.snap ? snap : amp ? snap : 0));
  const spin = (r.spin ?? 0) * Math.sin(t * (r.spinSpeed ?? 2.1));
  const panWave = 0.5 + 0.5 * Math.sin(t * (r.panSpeed ?? 1.35));
  const pan = (r.pan ?? 0) * panWave * w * 0.16;
  const drift = (r.drift ?? 0) * Math.sin(t * 0.55) * w * 0.07;
  const bounce = (r.bounce ?? 0) * Math.abs(Math.sin(t * 6.2)) * h * -0.045;
  const fish = r.fish ?? 0;
  const cover =
    1 +
    (r.shake ?? 0) * 0.07 +
    (r.vshake ?? 0) * 0.05 +
    (r.hshake ?? 0) * 0.05 +
    Math.abs(r.pan ?? 0) * 0.1 +
    Math.abs(r.drift ?? 0) * 0.08 +
    (r.bounce ?? 0) * 0.05;

  ctx.save();
  ctx.translate(w / 2 + jx + pan + drift, h / 2 + jy + bounce);
  ctx.rotate(spin);
  const sx = z * cover * (1 + fish * 0.28);
  const sy = z * cover * (1 + fish * 0.08 + (r.stretch ?? 0) * Math.sin(t * 7));
  ctx.scale(sx, sy);
  ctx.translate(-w / 2, -h / 2);

  const filters: string[] = [];
  if (r.filter) filters.push(r.filter);
  if (r.blur) filters.push(`blur(${Math.max(0.4, r.blur * (w / 1080)).toFixed(1)}px)`);
  if (r.hue) filters.push(`hue-rotate(${(Math.sin(t * 1.7) * r.hue).toFixed(0)}deg)`);
  ctx.filter = filters.join(" ") || "none";

  if (r.kaleido) {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(t * 0.35);
    for (let i = 0; i < 4; i += 1) {
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(shot, -w / 2, -h * 0.15, w, h * 0.55);
    }
    ctx.restore();
  } else if (r.split) {
    const gap = (0.5 - 0.5 * Math.sin(t * 2)) * w * 0.08 * r.split;
    ctx.drawImage(shot, 0, 0, w, h, -gap, 0, w * 0.5 + gap, h);
    ctx.drawImage(shot, 0, 0, w, h, w * 0.5, 0, w * 0.5 + gap, h);
  } else if (r.pixel) drawPixel(ctx, shot, w, h, r.pixel);
  else if (r.tiles) {
    const n = Math.max(2, Math.min(6, Math.round(r.tiles)));
    const tw = w / n;
    const th = h / n;
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) ctx.drawImage(shot, x * tw, y * th, tw + 1, th + 1);
    }
  } else if (r.mirror === "y") {
    ctx.drawImage(shot, 0, 0, w, h / 2, 0, 0, w, h / 2);
    ctx.save();
    ctx.translate(0, h);
    ctx.scale(1, -1);
    ctx.drawImage(shot, 0, 0, w, h / 2, 0, 0, w, h / 2);
    ctx.restore();
  } else if (r.mirror === "both") {
    ctx.drawImage(shot, 0, 0, w / 2, h / 2, 0, 0, w / 2, h / 2);
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(shot, 0, 0, w / 2, h / 2, 0, 0, w / 2, h / 2);
    ctx.restore();
    ctx.save();
    ctx.translate(0, h);
    ctx.scale(1, -1);
    ctx.drawImage(shot, 0, 0, w / 2, h / 2, 0, 0, w / 2, h / 2);
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(shot, 0, 0, w / 2, h / 2, 0, 0, w / 2, h / 2);
    ctx.restore();
  } else if (r.mirror) {
    ctx.drawImage(shot, 0, 0, w / 2, h, 0, 0, w / 2, h);
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(shot, 0, 0, w / 2, h, 0, 0, w / 2, h);
    ctx.restore();
  } else if (r.slices || r.glitch || r.wave || r.heat) drawBands(ctx, shot, r, w, h, t);
  else if (r.whip) {
    const dir = Math.sin(t * 2.4) >= 0 ? 1 : -1;
    const n = 5;
    for (let i = 0; i < n; i += 1) {
      ctx.globalAlpha = i === n - 1 ? 1 : 0.16;
      ctx.drawImage(shot, dir * (n - 1 - i) * r.whip * w * 0.028, 0, w, h);
    }
    ctx.globalAlpha = 1;
  } else ctx.drawImage(shot, 0, 0, w, h);

  if (r.rgb || r.prism) {
    const off = (r.rgb ?? r.prism ?? 0) * w * 0.018;
    const lift = r.prism ? off * 0.35 : 0;
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.72;
    ctx.filter = "grayscale(1) sepia(1) saturate(8) hue-rotate(-32deg) brightness(1.25)";
    ctx.drawImage(shot, -off, lift, w, h);
    ctx.filter = "grayscale(1) sepia(1) saturate(8) hue-rotate(150deg) brightness(1.15)";
    ctx.drawImage(shot, off, -lift, w, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none";
  }
  ctx.restore();
}

function vignette(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.22, w / 2, h / 2, Math.max(w, h) * 0.68);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${Math.min(0.88, amount).toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function withAlpha(hex: string, a: number) {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

function grainOf(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, t: number) {
  if (!noise) {
    noise = document.createElement("canvas");
    noise.width = 64;
    noise.height = 64;
  }
  const frame = Math.floor(t * 12);
  if (frame !== noiseFrame) {
    noiseFrame = frame;
    const nctx = noise.getContext("2d");
    if (!nctx) return;
    const img = nctx.createImageData(64, 64);
    let s = (frame * 9973 + 13) >>> 0;
    for (let i = 0; i < img.data.length; i += 4) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const v = s & 255;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    nctx.putImageData(img, 0, 0);
  }
  const pat = ctx.createPattern(noise, "repeat");
  if (!pat) return;
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = Math.min(0.8, 0.18 + amount * 0.5);
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function scanLines(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, t: number) {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${(0.32 * amount).toFixed(3)})`;
  const step = Math.max(3, Math.round(h / 72));
  for (let y = 0; y < h; y += step) ctx.fillRect(0, y, w, Math.max(1, step * 0.3));
  const y = ((t * 0.4) % 1) * h;
  const band = Math.max(6, h * 0.08);
  const g = ctx.createLinearGradient(0, y - band, 0, y + band);
  g.addColorStop(0, "rgba(0,212,200,0)");
  g.addColorStop(0.5, `rgba(243,255,254,${(0.62 * amount).toFixed(3)})`);
  g.addColorStop(1, "rgba(0,212,200,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, y - band, w, band * 2);
  ctx.restore();
}

function specks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  count: number,
  color: string,
  mode: "rain" | "snow" | "ember" | "dust" | "bits" | "stars" | "sparks",
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  for (let i = 0; i < count; i += 1) {
    const u = rand(0, i + 2);
    const v = (rand(0, i + 9) + t * (mode === "snow" ? 0.12 : mode === "ember" ? -0.2 : 0.45)) % 1;
    const x = u * w;
    const y = (v < 0 ? v + 1 : v) * h;
    ctx.globalAlpha = 0.35 + rand(0, i) * 0.55;
    if (mode === "rain") {
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - w * 0.012, y + h * 0.06);
      ctx.stroke();
    } else if (mode === "sparks") {
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      const a = rand(t, i) * Math.PI * 2;
      ctx.moveTo(w / 2, h / 2);
      ctx.lineTo(w / 2 + Math.cos(a) * w * (0.15 + rand(0, i) * 0.3), h / 2 + Math.sin(a) * h * 0.35);
      ctx.stroke();
    } else {
      const rad = mode === "stars" ? 1.2 : mode === "bits" ? 2.4 : 1.6;
      ctx.fillRect(x, y, rad, mode === "bits" ? rad * 0.6 : rad);
    }
  }
  ctx.restore();
}

function overlays(ctx: CanvasRenderingContext2D, shot: CanvasImageSource, r: FxRecipe, w: number, h: number, t: number) {
  const layer = (draw: () => void) => {
    ctx.save();
    draw();
    ctx.restore();
  };
  if (r.negative) {
    layer(() => {
      ctx.globalCompositeOperation = "difference";
      ctx.globalAlpha = Math.min(1, r.negative ?? 1);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
    });
  }
  if (r.bloom) {
    const src = scratch(1, ctx.canvas, w, h);
    layer(() => {
      ctx.globalCompositeOperation = "screen";
      ctx.filter = `blur(${(6 + (r.bloom ?? 1) * 10) * (w / 1080)}px)`;
      ctx.globalAlpha = Math.min(0.7, 0.28 * (r.bloom ?? 1));
      ctx.drawImage(src, 0, 0, w, h);
    });
  }
  if (r.ghost) {
    layer(() => {
      const dx = Math.sin(t * 2.2) * w * 0.02 * (r.ghost ?? 1);
      ctx.globalAlpha = 0.28 * (r.ghost ?? 1);
      ctx.drawImage(shot, dx, 0, w, h);
      ctx.globalAlpha = 0.16 * (r.ghost ?? 1);
      ctx.drawImage(shot, dx * 2.1, 0, w, h);
    });
  }
  if (r.edge) {
    layer(() => {
      ctx.globalCompositeOperation = "screen";
      ctx.filter = "contrast(2.6) brightness(1.5) saturate(1.6)";
      ctx.globalAlpha = Math.min(0.7, 0.4 * (r.edge ?? 1));
      ctx.drawImage(shot, w * 0.004, 0, w, h);
    });
  }
  if (r.tilt) {
    const src = scratch(1, ctx.canvas, w, h);
    layer(() => {
      ctx.filter = `blur(${(5 * (r.tilt ?? 1) * (w / 640)).toFixed(1)}px)`;
      const band = h * 0.3;
      ctx.beginPath();
      ctx.rect(0, 0, w, band);
      ctx.rect(0, h - band, w, band);
      ctx.clip();
      ctx.drawImage(src, 0, 0, w, h);
    });
  }
  if (r.flash) {
    const intro = t < 0.28 ? 1 - t / 0.28 : 0;
    const pulse = Math.sin(t * (r.flashSpeed ?? 8));
    const hit = Math.max(intro, pulse > 0.55 ? (pulse - 0.55) / 0.45 : 0);
    if (hit > 0.04) {
      layer(() => {
        ctx.globalAlpha = Math.min(0.92, hit * (r.flash ?? 1));
        ctx.fillStyle = r.flashColor ?? "#ffffff";
        ctx.fillRect(0, 0, w, h);
      });
    }
  }
  if (r.black) {
    const intro = t < 0.22 ? 1 - t / 0.22 : 0;
    const pulse = Math.sin(t * 7.5);
    const hit = Math.max(intro, pulse > 0.65 ? (pulse - 0.65) / 0.35 : 0);
    if (hit > 0.04) {
      layer(() => {
        ctx.globalAlpha = Math.min(0.9, hit * (r.black ?? 1));
        ctx.fillStyle = "#050506";
        ctx.fillRect(0, 0, w, h);
      });
    }
  }
  if (r.strobe && Math.sin(t * 26) > 0.15) {
    layer(() => {
      ctx.globalAlpha = 0.72 * (r.strobe ?? 1);
      ctx.fillStyle = Math.sin(t * 13) > 0 ? "#ffffff" : "#050506";
      ctx.fillRect(0, 0, w, h);
    });
  }
  if (r.flicker) {
    const a = (0.5 + 0.5 * Math.sin(t * 23)) * (r.flicker ?? 1) * 0.28;
    layer(() => {
      ctx.globalAlpha = a;
      ctx.fillStyle = Math.sin(t * 17) > 0 ? "#ffffff" : "#050506";
      ctx.fillRect(0, 0, w, h);
    });
  }
  if (r.burn) {
    layer(() => {
      ctx.globalCompositeOperation = "screen";
      const g = ctx.createRadialGradient(w * (0.2 + 0.15 * Math.sin(t)), h * 0.15, 8, w * 0.5, h * 0.45, w * 0.75);
      g.addColorStop(0, `rgba(255,230,200,${0.45 * (r.burn ?? 1)})`);
      g.addColorStop(0.45, `rgba(255,70,12,${0.4 * (r.burn ?? 1)})`);
      g.addColorStop(1, "rgba(40,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  }
  if (r.leak || r.leak2) {
    layer(() => {
      ctx.globalCompositeOperation = "screen";
      const paintLeak = (color: string, ax: number, ay: number) => {
        const x = w * (ax + 0.08 * Math.sin(t * 0.7 + ax));
        const y = h * (ay + 0.06 * Math.cos(t * 0.5));
        const g = ctx.createRadialGradient(x, y, 4, x, y, w * 0.42);
        g.addColorStop(0, withAlpha(color, 0.55));
        g.addColorStop(1, withAlpha(color, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      };
      if (r.leak) paintLeak(r.leak, 0.12, 0.18);
      if (r.leak2) paintLeak(r.leak2, 0.82, 0.7);
    });
  }
  if (r.aura) {
    layer(() => {
      ctx.globalCompositeOperation = "screen";
      const pulse = 0.6 + 0.4 * Math.sin(t * 4.2);
      const color = r.auraColor ?? "#ffe14a";
      const rad = Math.min(w, h) * (0.28 + 0.06 * Math.sin(t * 3));
      const g = ctx.createRadialGradient(w / 2, h * 0.55, rad * 0.15, w / 2, h * 0.55, rad);
      g.addColorStop(0, withAlpha(color, 0.15 * (r.aura ?? 1)));
      g.addColorStop(0.55, withAlpha(color, 0.55 * (r.aura ?? 1) * pulse));
      g.addColorStop(1, withAlpha(color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  }
  if (r.lines) {
    layer(() => {
      ctx.translate(w / 2, h / 2);
      ctx.rotate(t * 0.25);
      ctx.strokeStyle = r.lineColor ?? "#f3f3f5";
      ctx.globalAlpha = 0.28 + (r.lines ?? 1) * 0.4;
      const n = 16;
      for (let i = 0; i < n; i += 1) {
        const a = (i / n) * Math.PI * 2;
        ctx.lineWidth = 1 + (i % 3);
        ctx.beginPath();
        const r0 = Math.min(w, h) * 0.12;
        const r1 = Math.min(w, h) * (0.55 + (r.lines ?? 1) * 0.25);
        ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
        ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.stroke();
      }
    });
  }
  if (r.shock) {
    const p = (t * 0.65) % 1;
    layer(() => {
      ctx.strokeStyle = r.shockColor ?? "#f3f3f5";
      ctx.globalAlpha = (1 - p) * (r.shock ?? 1);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 8 + p * Math.min(w, h) * 0.48, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
  if (r.grain) grainOf(ctx, w, h, r.grain, t);
  if (r.scan) scanLines(ctx, w, h, r.scan, t);
  if (r.vhs) {
    const vhs = r.vhs;
    scanLines(ctx, w, h, 0.55 * vhs, t);
    grainOf(ctx, w, h, 0.35 * vhs, t);
    layer(() => {
      const y = ((t * 0.33) % 1) * h;
      ctx.globalAlpha = 0.45 * vhs;
      ctx.fillStyle = "#f3f3f5";
      ctx.fillRect(0, y, w, Math.max(2, h * 0.012));
      ctx.fillStyle = "rgba(0,212,200,0.35)";
      ctx.fillRect(0, y + 4, w, 2);
    });
  }
  if (r.tv) {
    grainOf(ctx, w, h, 0.8 * (r.tv ?? 1), t);
    layer(() => {
      const y = ((t * 0.8) % 1) * h;
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#f3f3f5";
      ctx.fillRect(0, y, w, h * 0.08);
    });
  }
  if (r.rain) specks(ctx, w, h, t, Math.round(10 + r.rain * 18), "rgba(210,230,255,0.8)", "rain");
  if (r.snow) specks(ctx, w, h, t, Math.round(8 + r.snow * 16), "rgba(243,243,245,0.9)", "snow");
  if (r.ember) specks(ctx, w, h, t, Math.round(6 + r.ember * 10), "rgba(255,140,40,0.9)", "ember");
  if (r.dust) specks(ctx, w, h, t * 0.4, Math.round(6 + r.dust * 10), "rgba(230,220,200,0.45)", "dust");
  if (r.stars) specks(ctx, w, h, t * 0.15, Math.round(8 + r.stars * 14), "rgba(243,243,245,0.9)", "stars");
  if (r.sparks) specks(ctx, w, h, t, Math.round(5 + r.sparks * 8), "rgba(140,220,255,0.9)", "sparks");
  if (r.bits) specks(ctx, w, h, t * 0.6, Math.round(8 + r.bits * 10), r.bitColor ?? "rgba(255,120,170,0.85)", "bits");
  if (r.fog) {
    const fog = r.fog;
    layer(() => {
      const g = ctx.createLinearGradient(0, h * 0.35, 0, h);
      g.addColorStop(0, "rgba(220,228,236,0)");
      g.addColorStop(1, `rgba(220,228,236,${(0.28 * fog).toFixed(3)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  }
  if (r.bolt && (Math.sin(t * 18) > 0.82 || rand(Math.floor(t * 6) / 6, 3) > 0.78)) {
    layer(() => {
      ctx.strokeStyle = "#e8f6ff";
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.9 * (r.bolt ?? 1);
      ctx.beginPath();
      let x = w * (0.3 + rand(t, 4) * 0.4);
      ctx.moveTo(x, 0);
      for (let y = 0; y < h; y += h / 7) {
        x += (rand(t, y) - 0.5) * w * 0.12;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
    });
  }
  if (r.matrix) {
    layer(() => {
      ctx.fillStyle = "#3dff8a";
      ctx.font = `${Math.max(8, Math.round(w * 0.035))}px ui-monospace, monospace`;
      const cols = 14;
      for (let i = 0; i < cols; i += 1) {
        const x = ((i + 0.2) * w) / cols;
        const head = ((t * 0.35 + i * 0.08) % 1) * h;
        for (let k = 0; k < 7; k += 1) {
          ctx.globalAlpha = (1 - k / 7) * 0.85 * (r.matrix ?? 1);
          ctx.fillText(k % 2 ? "1" : "0", x, head - k * h * 0.045);
        }
      }
    });
  }
  if (r.hud) {
    layer(() => {
      ctx.strokeStyle = "#00d4c8";
      ctx.globalAlpha = 0.85 * (r.hud ?? 1);
      ctx.lineWidth = 1.5;
      const m = Math.max(8, w * 0.05);
      const s = Math.max(10, w * 0.07);
      const corners = [
        [m, m, 1, 1],
        [w - m, m, -1, 1],
        [m, h - m, 1, -1],
        [w - m, h - m, -1, -1],
      ];
      for (const [x, y, dx, dy] of corners) {
        ctx.beginPath();
        ctx.moveTo(x, y + dy * s);
        ctx.lineTo(x, y);
        ctx.lineTo(x + dx * s, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.35;
      ctx.fillRect(w * 0.08, h * 0.9, w * 0.2, 2);
    });
  }
  if (r.portal) {
    layer(() => {
      ctx.strokeStyle = r.auraColor ?? "#00d4c8";
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, w * 0.2, h * 0.32, t * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
  if (r.clock) {
    const p = (t * 0.35) % 1;
    layer(() => {
      ctx.globalAlpha = 0.72 * (r.clock ?? 1);
      ctx.fillStyle = "#050506";
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2);
      ctx.arc(w / 2, h / 2, Math.hypot(w, h), -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    });
  }
  if (r.ink) {
    layer(() => {
      ctx.fillStyle = `rgba(8,6,10,${0.35 + 0.25 * Math.sin(t)})`;
      const blobs = 4;
      for (let i = 0; i < blobs; i += 1) {
        const x = w * (0.2 + 0.6 * rand(0, i));
        const y = h * (0.2 + 0.6 * rand(0, i + 5));
        const rad = (0.08 + 0.12 * (0.5 + 0.5 * Math.sin(t * 1.4 + i))) * (r.ink ?? 1) * w;
        ctx.beginPath();
        ctx.ellipse(x, y, rad, rad * 0.72, i, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
  if (r.halftone) {
    layer(() => {
      ctx.fillStyle = `rgba(5,5,6,${Math.min(0.75, 0.35 + (r.halftone ?? 1) * 0.35).toFixed(3)})`;
      const step = Math.max(6, Math.round(Math.min(w, h) / 22));
      for (let y = step * 0.5; y < h; y += step) {
        const nudge = Math.floor(y / step) % 2 === 0 ? 0 : step * 0.5;
        for (let x = nudge; x < w; x += step) {
          ctx.beginPath();
          ctx.arc(x, y, step * 0.28, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
  }
  if (r.letterbox || r.gate) {
    const bar = (r.letterbox ?? (r.gate ? 0.12 : 0)) * h;
    layer(() => {
      ctx.fillStyle = "#050506";
      ctx.fillRect(0, 0, w, bar);
      ctx.fillRect(0, h - bar, w, bar);
      if (r.gate) {
        ctx.fillStyle = "#d8d4cc";
        const hole = Math.max(3, h * 0.018);
        for (let y = hole; y < h; y += hole * 2.4) {
          ctx.beginPath();
          ctx.arc(w * 0.035, y, hole * 0.45, 0, Math.PI * 2);
          ctx.arc(w * 0.965, y, hole * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
  }
  if (r.frame) {
    const frame = r.frame;
    layer(() => {
      ctx.strokeStyle = "#f4f1ea";
      ctx.lineWidth = Math.max(4, w * 0.035 * frame);
      ctx.strokeRect(ctx.lineWidth * 0.4, ctx.lineWidth * 0.4, w - ctx.lineWidth, h - ctx.lineWidth * 1.8);
      ctx.fillStyle = "#f4f1ea";
      ctx.fillRect(0, h - ctx.lineWidth * 1.6, w, ctx.lineWidth * 1.6);
    });
  }
  if (r.rec) {
    const on = Math.sin(t * 6) > 0;
    layer(() => {
      ctx.fillStyle = on ? "#ff3355" : "rgba(255,51,85,0.3)";
      ctx.beginPath();
      ctx.arc(w * 0.1, h * 0.14, Math.min(w, h) * 0.035, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f3f3f5";
      ctx.font = `${Math.max(10, Math.round(w * 0.055))}px sans-serif`;
      ctx.fillText("REC", w * 0.15, h * 0.17);
    });
  }
  if (r.vignette) {
    layer(() => vignette(ctx, w, h, r.vignette ?? 0));
  }
}

export function paintRecipe(
  ctx: CanvasRenderingContext2D,
  shot: CanvasImageSource,
  recipe: FxRecipe,
  w: number,
  h: number,
  local: number,
) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  if (spatial(recipe)) {
    ctx.fillStyle = "#050506";
    ctx.fillRect(0, 0, w, h);
    drawSpatial(ctx, shot, recipe, w, h, local);
  }
  overlays(ctx, shot, recipe, w, h, local);
  ctx.restore();
}

const LEGACY_LOOK: Record<string, FxRecipe> = {
  pixel: { pixel: 2.4 },
  chroma: { rgb: 1.35 },
  scan: { scan: 1, grain: 0.2 },
  flash: { flash: 0.95, flashSpeed: 6 },
  oldcam: { letterbox: 0.11, grain: 0.45, leak: "#ffd7a8", vignette: 0.7, filter: "sepia(0.28) contrast(1.04)" },
  noise: { grain: 1, tv: 0.4 },
  burn: { burn: 1, flicker: 0.15 },
  slices: { slices: 1 },
  negative: { negative: 1 },
  halftone: { halftone: 1, filter: "contrast(1.15)" },
  mirror: { mirror: "x" },
  tiles: { tiles: 3 },
  blur: { blur: 8 },
  zoom: { zoom: 0.08, zoomSpeed: 6, zoomBase: 1.02 },
  dizzy: { spin: 0.07, rgb: 0.45, zoomBase: 1.04 },
  sharpen: { filter: "contrast(1.28) saturate(1.12)" },
  mutation: { glitch: 0.6, hue: 46, flash: 0.3, flashColor: "#ff4d12" },
};

function paintKeyThumb(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#00d85a";
  ctx.fillRect(0, 0, w, h);
  const src = ensurePlate();
  if (!src) return;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(w * 0.48, h * 0.58, w * 0.16, h * 0.42, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(src, 0, 0, w, h);
  ctx.restore();
}

export function paintPreview(canvas: HTMLCanvasElement, id: string, time: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  if (!w || !h) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, w, h);
  const src = ensurePlate();
  if (src) ctx.drawImage(src, 0, 0, w, h);
  else drawPlate(ctx, w, h);
  if (id === "none") return;
  if (id === "key") {
    paintKeyThumb(ctx, w, h);
    return;
  }
  const recipe = recipeOf(id) ?? LEGACY_LOOK[id];
  if (!recipe) return;
  const shot = scratch(0, canvas, w, h);
  paintRecipe(ctx, shot, recipe, w, h, time);
}

const jobs = new Map<HTMLCanvasElement, string>();
let raf = 0;
let last = 0;

function motionOk() {
  return typeof matchMedia === "undefined" || !matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function pump(now: number) {
  if (jobs.size === 0) {
    raf = 0;
    return;
  }
  if (now - last > 84) {
    last = now;
    const time = now / 1000;
    for (const [canvas, id] of jobs) paintPreview(canvas, id, time);
  }
  raf = requestAnimationFrame(pump);
}

export function watchSwatch(canvas: HTMLCanvasElement, id: string) {
  let on = false;
  const arm = () => {
    paintPreview(canvas, id, 0.42);
    if (!motionOk()) return;
    jobs.set(canvas, id);
    if (!raf) raf = requestAnimationFrame(pump);
  };
  const io = new IntersectionObserver((entries) => {
    const hit = entries.some((entry) => entry.isIntersecting);
    if (hit && !on) {
      on = true;
      arm();
    } else if (!hit && on) {
      on = false;
      jobs.delete(canvas);
    }
  });
  io.observe(canvas);
  return () => {
    on = false;
    jobs.delete(canvas);
    io.disconnect();
  };
}

export function paintLook(
  canvas: HTMLCanvasElement,
  look: { css?: string; filterId?: string; patch?: Grade["patch"] },
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const src = ensurePlate();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  const parts: string[] = [];
  if (look.css && look.css !== "none") parts.push(look.css);
  const patch = look.patch;
  if (patch) {
    const preset = FILTERS.find((item) => item.id === patch.filter)?.css ?? "none";
    if (preset !== "none") parts.push(preset);
    parts.push(`brightness(${patch.brightness}) contrast(${patch.contrast}) saturate(${patch.saturate})`);
  }
  ctx.filter = parts.length ? parts.join(" ") : "none";
  if (src) ctx.drawImage(src, 0, 0, w, h);
  else drawPlate(ctx, w, h);
  ctx.filter = "none";
  if (!patch && !look.filterId) return;
  if (patch && patch.wash > 0.01) {
    ctx.fillStyle = `rgba(255,255,255,${(patch.wash * 0.55).toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);
  }
  if (patch && Math.abs(patch.temperature) > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = Math.min(0.9, Math.abs(patch.temperature) * 0.85);
    ctx.fillStyle = patch.temperature > 0 ? "#ff7a2f" : "#2f6dff";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  if (patch && Math.abs(patch.tint) > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = Math.min(0.75, Math.abs(patch.tint) * 0.7);
    ctx.fillStyle = patch.tint > 0 ? "#ff4fa3" : "#3dff9a";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  const id = look.filterId ?? patch?.filter;
  if (id === "grain") grainOf(ctx, w, h, 0.85, 0.4);
  if (id === "vhs") scanLines(ctx, w, h, 0.55, 0.3);
  if (patch && patch.vignette > 0.02) vignette(ctx, w, h, patch.vignette);
}
