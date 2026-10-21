function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function sky(ctx: CanvasRenderingContext2D, w: number, h: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [p, c] of stops) g.addColorStop(p, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function drawGenerator(
  ctx: CanvasRenderingContext2D,
  id: string,
  w: number,
  h: number,
  t: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  if (id === "tide") tide(ctx, w, h, t);
  else if (id === "bokeh") bokeh(ctx, w, h, t);
  else if (id === "film") film(ctx, w, h, t);
  else if (id === "pulse") pulse(ctx, w, h, t);
  else if (id === "dusk") dusk(ctx, w, h, t);
  else neon(ctx, w, h, t);
  ctx.restore();
}

function neon(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  sky(ctx, w, h, [
    [0, "#07091a"],
    [0.45, "#1a1040"],
    [0.72, "#241447"],
    [1, "#07080f"],
  ]);
  ctx.fillStyle = "#f4efe2";
  const moonX = w * 0.78;
  const moonY = h * 0.16;
  ctx.beginPath();
  ctx.arc(moonX, moonY, Math.min(w, h) * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#9b8cff";
  ctx.beginPath();
  ctx.arc(moonX, moonY, Math.min(w, h) * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  for (let i = 0; i < 40; i += 1) {
    const x = hash(i * 3.1) * w;
    const y = hash(i * 8.7) * h * 0.42;
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.7 + i));
    ctx.globalAlpha = 0.25 + tw * 0.7;
    ctx.fillStyle = "#fff";
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;

  const ground = h * 0.78;
  const count = 9;
  for (let i = 0; i < count; i += 1) {
    const bw = w / count;
    const bh = h * (0.18 + hash(i + 4) * 0.28);
    const x = i * bw;
    const y = ground - bh;
    ctx.fillStyle = i % 2 === 0 ? "#0c1020" : "#121628";
    ctx.fillRect(x, y, bw + 1, bh);
    const win = Math.max(4, bw * 0.12);
    for (let wy = y + win; wy < ground - win; wy += win * 2.3) {
      for (let wx = x + win * 0.8; wx < x + bw - win; wx += win * 2.1) {
        const on = hash(i * 20 + wy * 0.1 + wx * 0.07) > 0.42;
        if (!on) continue;
        const flicker = hash(Math.floor(t * 2) + wx + wy) > 0.92 ? 0.25 : 1;
        ctx.globalAlpha = flicker;
        ctx.fillStyle = hash(wx + wy) > 0.7 ? "#9ae7ff" : "#ffd27a";
        ctx.fillRect(wx, wy, win, win * 1.35);
      }
    }
    ctx.globalAlpha = 1;
  }

  const signs = [
    { x: w * 0.12, y: h * 0.48, c: "#14f1d9", label: "OPEN" },
    { x: w * 0.58, y: h * 0.42, c: "#ff2d7b", label: "LIVE" },
  ];
  ctx.font = `700 ${Math.max(14, w * 0.045)}px "Plus Jakarta Sans", sans-serif`;
  ctx.textBaseline = "middle";
  for (const sign of signs) {
    const pulse = 0.75 + Math.sin(t * 3 + sign.x) * 0.25;
    ctx.save();
    ctx.shadowColor = sign.c;
    ctx.shadowBlur = 18 * pulse;
    ctx.strokeStyle = sign.c;
    ctx.lineWidth = 2;
    ctx.strokeRect(sign.x, sign.y, w * 0.22, h * 0.06);
    ctx.fillStyle = sign.c;
    ctx.globalAlpha = pulse;
    ctx.fillText(sign.label, sign.x + w * 0.03, sign.y + h * 0.03);
    ctx.restore();
  }

  ctx.fillStyle = "#05060d";
  ctx.fillRect(0, ground, w, h - ground);
  const lane = ground + (h - ground) * 0.45;
  ctx.strokeStyle = "#1c2438";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, lane);
  ctx.lineTo(w, lane);
  ctx.stroke();
  const offset = (t * 140) % 80;
  for (let x = -80 + offset; x < w; x += 80) {
    ctx.fillStyle = "rgba(20,241,217,0.85)";
    ctx.fillRect(x, lane - 2, 36, 3);
    ctx.fillStyle = "rgba(255,90,140,0.75)";
    ctx.fillRect(w - x - 36, lane + 10, 28, 3);
  }
}

function tide(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  sky(ctx, w, h, [
    [0, "#071423"],
    [0.4, "#12324a"],
    [0.62, "#1c6a78"],
    [1, "#042833"],
  ]);
  const sunY = h * 0.58 + Math.sin(t * 0.35) * h * 0.01;
  const sun = ctx.createRadialGradient(w * 0.5, sunY, 4, w * 0.5, sunY, w * 0.28);
  sun.addColorStop(0, "rgba(255,236,196,0.95)");
  sun.addColorStop(0.2, "rgba(255,186,120,0.55)");
  sun.addColorStop(1, "rgba(255,186,120,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);

  const bands = [
    { y: 0.62, a: 0.035, c: "#8ee7ef", sp: 1.1 },
    { y: 0.7, a: 0.05, c: "#1a8ea0", sp: 0.8 },
    { y: 0.78, a: 0.06, c: "#0c6d84", sp: 1.4 },
    { y: 0.88, a: 0.07, c: "#08485e", sp: 0.6 },
  ];
  for (const band of bands) {
    ctx.beginPath();
    const base = h * band.y;
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) {
      const y =
        base +
        Math.sin(x * band.a + t * band.sp) * h * 0.02 +
        Math.sin(x * band.a * 0.35 + t * 0.7) * h * 0.012;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = band.c;
    ctx.fill();
  }
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const foam = h * 0.62;
  for (let x = 0; x <= w; x += 6) {
    const y = foam + Math.sin(x * 0.035 + t * 1.1) * h * 0.018;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function bokeh(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  sky(ctx, w, h, [
    [0, "#120814"],
    [0.5, "#1a1030"],
    [1, "#07060e"],
  ]);
  const colors = ["#ff5d8f", "#00d4c8", "#ffd36a", "#8aa4ff", "#ffffff"];
  for (let i = 0; i < 18; i += 1) {
    const cx = hash(i * 4.2) * w + Math.sin(t * 0.35 + i) * w * 0.03;
    const cy = hash(i * 9.1) * h + Math.cos(t * 0.28 + i * 1.7) * h * 0.03;
    const r = (0.04 + hash(i * 2.2) * 0.12) * Math.min(w, h);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, colors[i % colors.length]);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.28 + hash(i) * 0.35;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function film(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  sky(ctx, w, h, [
    [0, "#2a160f"],
    [0.4, "#c46a3a"],
    [0.7, "#7a2e3a"],
    [1, "#1a0d10"],
  ]);
  const leakX = ((t * 0.15) % 1.4) * w - w * 0.2;
  const leak = ctx.createRadialGradient(leakX, h * 0.3, 10, leakX, h * 0.4, w * 0.45);
  leak.addColorStop(0, "rgba(255,214,150,0.55)");
  leak.addColorStop(1, "rgba(255,214,150,0)");
  ctx.fillStyle = leak;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#1a0c08";
  ctx.fillRect(0, 0, w, h * 0.08);
  ctx.fillRect(0, h * 0.92, w, h * 0.08);

  const frame = Math.floor(t * 12);
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "#fff";
  for (let i = 0; i < 90; i += 1) {
    const x = hash(i * 13 + frame * 17) * w;
    const y = hash(i * 29 + frame * 3) * h;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function pulse(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = "#07080d";
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h * 0.46;
  for (let i = 0; i < 4; i += 1) {
    const p = (t * 0.35 + i * 0.25) % 1;
    ctx.beginPath();
    ctx.arc(cx, cy, p * Math.min(w, h) * 0.48, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0,212,200,${(1 - p) * 0.7})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  const bars = 24;
  const gap = w / (bars + 2);
  for (let i = 0; i < bars; i += 1) {
    const n = Math.abs(Math.sin(t * 3.2 + i * 0.55)) * 0.7 + Math.abs(Math.sin(t * 8 + i)) * 0.3;
    const bh = n * h * 0.28 + h * 0.02;
    const x = gap + i * gap;
    ctx.fillStyle = i % 3 === 0 ? "#00d4c8" : "#d7fff9";
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x, cy + h * 0.18 - bh, gap * 0.55, bh);
  }
  ctx.globalAlpha = 1;
}

function dusk(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  sky(ctx, w, h, [
    [0, "#1b1248"],
    [0.38, "#c4546a"],
    [0.58, "#ffb067"],
    [0.7, "#ffd7a1"],
    [1, "#1d3d5c"],
  ]);
  const sunY = h * 0.66;
  ctx.fillStyle = "#ffefd2";
  ctx.beginPath();
  ctx.arc(w * 0.5 + Math.sin(t * 0.2) * 8, sunY, Math.min(w, h) * 0.07, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#122033";
  ctx.beginPath();
  ctx.moveTo(0, h * 0.78);
  for (let x = 0; x <= w; x += 10) {
    const y = h * 0.8 + Math.sin(x * 0.02 + t * 0.8) * h * 0.012;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();

  ctx.fillStyle = "#0d1724";
  const hills = [
    [0.08, 0.62, 0.22],
    [0.38, 0.58, 0.28],
    [0.7, 0.64, 0.26],
  ] as const;
  for (const [cx, cy, r] of hills) {
    ctx.beginPath();
    ctx.ellipse(w * cx, h * cy, w * r, h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawSticker(
  ctx: CanvasRenderingContext2D,
  id: string,
  w: number,
  h: number,
  t: number,
  ox = 0,
  oy = 0,
  rotation = 0,
  scale = 1,
) {
  ctx.save();
  const s = Math.min(w, h);
  ctx.translate(w * 0.5 + ox * w * 0.32, h * 0.46 + oy * h * 0.32);
  if (rotation) ctx.rotate((rotation * Math.PI) / 180);
  if (Math.abs(scale - 1) > 0.001) ctx.scale(scale, scale);
  const bob = Math.sin(t * 2.2) * s * 0.012;
  ctx.translate(0, bob);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const draw = STICKER_DRAW[id] ?? star;
  draw(ctx, s, t);
  ctx.restore();
}

function star(ctx: CanvasRenderingContext2D, s: number, t: number) {
  const r = s * 0.16;
  const spin = t * 0.4;
  ctx.rotate(spin);
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const rad = i % 2 === 0 ? r : r * 0.42;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = "#00d4c8";
  ctx.shadowColor = "rgba(0,212,200,0.8)";
  ctx.shadowBlur = 16;
  ctx.fill();
}

function ring(ctx: CanvasRenderingContext2D, s: number, t: number) {
  ctx.rotate(t * 0.8);
  ctx.strokeStyle = "#f7f7f8";
  ctx.lineWidth = s * 0.012;
  ctx.setLineDash([s * 0.04, s * 0.025]);
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "#00d4c8";
  ctx.lineWidth = s * 0.008;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.1, 0, Math.PI * 2);
  ctx.stroke();
}

function burst(ctx: CanvasRenderingContext2D, s: number, t: number) {
  const n = 12;
  ctx.strokeStyle = "#ffe14a";
  ctx.lineWidth = s * 0.008;
  ctx.shadowColor = "rgba(255,225,74,0.7)";
  ctx.shadowBlur = 10;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 + t * 0.3;
    const inner = s * 0.05;
    const outer = s * (0.14 + (i % 2) * 0.04);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.stroke();
  }
}

function badge(ctx: CanvasRenderingContext2D, s: number) {
  const bw = s * 0.42;
  const bh = s * 0.12;
  ctx.fillStyle = "#00d4c8";
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
  ctx.fill();
  ctx.fillStyle = "#042421";
  ctx.font = `800 ${s * 0.055}px "Plus Jakarta Sans", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("NUEVO", 0, 1);
}

function arrow(ctx: CanvasRenderingContext2D, s: number, t: number) {
  const nudge = Math.sin(t * 3) * s * 0.02;
  ctx.translate(nudge, 0);
  ctx.fillStyle = "#f7f7f8";
  ctx.beginPath();
  ctx.moveTo(-s * 0.12, -s * 0.05);
  ctx.lineTo(s * 0.02, -s * 0.05);
  ctx.lineTo(s * 0.02, -s * 0.1);
  ctx.lineTo(s * 0.16, 0);
  ctx.lineTo(s * 0.02, s * 0.1);
  ctx.lineTo(s * 0.02, s * 0.05);
  ctx.lineTo(-s * 0.12, s * 0.05);
  ctx.closePath();
  ctx.fill();
}

function spark(ctx: CanvasRenderingContext2D, s: number, t: number) {
  const spots = [
    [0, 0, 1],
    [-0.16, 0.08, 0.45],
    [0.14, -0.1, 0.55],
    [0.08, 0.16, 0.35],
  ] as const;
  spots.forEach(([x, y, sc], i) => {
    const a = 0.55 + Math.sin(t * 4 + i) * 0.45;
    ctx.save();
    ctx.translate(x * s, y * s);
    ctx.rotate(t * 0.5 + i);
    ctx.globalAlpha = a;
    ctx.fillStyle = i === 0 ? "#00d4c8" : "#f7f7f8";
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.08 * sc);
    ctx.quadraticCurveTo(0, 0, s * 0.08 * sc, 0);
    ctx.quadraticCurveTo(0, 0, 0, s * 0.08 * sc);
    ctx.quadraticCurveTo(0, 0, -s * 0.08 * sc, 0);
    ctx.quadraticCurveTo(0, 0, 0, -s * 0.08 * sc);
    ctx.fill();
    ctx.restore();
  });
}

function note(ctx: CanvasRenderingContext2D, s: number, t: number) {
  ctx.rotate(-0.2 + Math.sin(t * 2) * 0.08);
  ctx.fillStyle = "#00d4c8";
  ctx.beginPath();
  ctx.ellipse(-s * 0.045, s * 0.08, s * 0.07, s * 0.05, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(s * 0.012, -s * 0.16, Math.max(2, s * 0.018), s * 0.25);
  ctx.beginPath();
  ctx.moveTo(s * 0.03, -s * 0.16);
  ctx.lineTo(s * 0.15, -s * 0.11);
  ctx.lineTo(s * 0.15, -s * 0.06);
  ctx.lineTo(s * 0.03, -s * 0.1);
  ctx.fill();
}

function heart(ctx: CanvasRenderingContext2D, s: number, t: number) {
  const beat = 1 + Math.sin(t * 3.4) * 0.07;
  ctx.scale(beat, beat);
  ctx.fillStyle = "#ff5d78";
  ctx.beginPath();
  ctx.moveTo(0, s * 0.14);
  ctx.bezierCurveTo(-s * 0.24, -s * 0.02, -s * 0.12, -s * 0.2, 0, -s * 0.07);
  ctx.bezierCurveTo(s * 0.12, -s * 0.2, s * 0.24, -s * 0.02, 0, s * 0.14);
  ctx.fill();
}

function fire(ctx: CanvasRenderingContext2D, s: number, t: number) {
  ctx.scale(1, 1 + Math.sin(t * 8) * 0.08);
  ctx.fillStyle = "#ff8a00";
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.2);
  ctx.quadraticCurveTo(s * 0.18, 0, s * 0.07, s * 0.14);
  ctx.quadraticCurveTo(0, s * 0.2, -s * 0.07, s * 0.14);
  ctx.quadraticCurveTo(-s * 0.18, 0, 0, -s * 0.2);
  ctx.fill();
  ctx.fillStyle = "#ffe14a";
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.05);
  ctx.quadraticCurveTo(s * 0.08, s * 0.05, 0, s * 0.13);
  ctx.quadraticCurveTo(-s * 0.08, s * 0.05, 0, -s * 0.05);
  ctx.fill();
}

function bolt(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = "#ffe14a";
  ctx.beginPath();
  ctx.moveTo(s * 0.05, -s * 0.2);
  ctx.lineTo(-s * 0.09, s * 0.01);
  ctx.lineTo(-s * 0.01, s * 0.01);
  ctx.lineTo(-s * 0.07, s * 0.2);
  ctx.lineTo(s * 0.11, -s * 0.02);
  ctx.lineTo(s * 0.02, -s * 0.02);
  ctx.closePath();
  ctx.fill();
}

function mic(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = "#f7f7f8";
  ctx.beginPath();
  ctx.roundRect(-s * 0.045, -s * 0.17, s * 0.09, s * 0.16, s * 0.045);
  ctx.fill();
  ctx.strokeStyle = "#00d4c8";
  ctx.lineWidth = Math.max(2, s * 0.012);
  ctx.beginPath();
  ctx.arc(0, -s * 0.02, s * 0.085, 0, Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, s * 0.065);
  ctx.lineTo(0, s * 0.15);
  ctx.moveTo(-s * 0.06, s * 0.15);
  ctx.lineTo(s * 0.06, s * 0.15);
  ctx.stroke();
}

function vinyl(ctx: CanvasRenderingContext2D, s: number, t: number) {
  ctx.rotate(t * 0.9);
  ctx.fillStyle = "#141416";
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(243,243,245,0.4)";
  ctx.lineWidth = Math.max(1, s * 0.004);
  for (let i = 1; i <= 3; i += 1) {
    ctx.beginPath();
    ctx.arc(0, 0, s * (0.05 + i * 0.028), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#00d4c8";
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.042, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0c0c0e";
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.012, 0, Math.PI * 2);
  ctx.fill();
}

function crown(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = "#ffe14a";
  ctx.beginPath();
  ctx.moveTo(-s * 0.16, s * 0.1);
  ctx.lineTo(-s * 0.16, -s * 0.02);
  ctx.lineTo(-s * 0.08, s * 0.04);
  ctx.lineTo(0, -s * 0.15);
  ctx.lineTo(s * 0.08, s * 0.04);
  ctx.lineTo(s * 0.16, -s * 0.02);
  ctx.lineTo(s * 0.16, s * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#00d4c8";
  for (const x of [-s * 0.16, 0, s * 0.16]) {
    ctx.beginPath();
    ctx.arc(x, x === 0 ? -s * 0.15 : -s * 0.02, s * 0.018, 0, Math.PI * 2);
    ctx.fill();
  }
}

function play(ctx: CanvasRenderingContext2D, s: number, t: number) {
  const n = 1 + Math.sin(t * 3) * 0.04;
  ctx.scale(n, n);
  ctx.fillStyle = "#00d4c8";
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#042421";
  ctx.beginPath();
  ctx.moveTo(-s * 0.045, -s * 0.07);
  ctx.lineTo(s * 0.08, 0);
  ctx.lineTo(-s * 0.045, s * 0.07);
  ctx.closePath();
  ctx.fill();
}

const STICKER_DRAW: Record<string, (ctx: CanvasRenderingContext2D, s: number, t: number) => void> = {
  star,
  ring,
  burst,
  badge: (ctx, s) => badge(ctx, s),
  arrow,
  spark,
  note,
  heart,
  fire,
  bolt: (ctx, s) => bolt(ctx, s),
  mic: (ctx, s) => mic(ctx, s),
  vinyl,
  crown: (ctx, s) => crown(ctx, s),
  play,
};
