import type { Clip, EnterId, LeaveId, MidId } from "@/lib/editor/types";

export interface MotionFrame {
  dx: number;
  dy: number;
  scale: number;
  rot: number;
  alpha: number;
  blur: number;
}

const STILL: MotionFrame = { dx: 0, dy: 0, scale: 1, rot: 0, alpha: 1, blur: 0 };

function windowOf(asked: number | undefined, dur: number) {
  const raw = asked == null || asked <= 0 ? Math.min(0.45, dur * 0.34) : asked;
  const cap = Math.max(0.12, dur * 0.85);
  return Math.min(Math.max(0.08, raw), cap);
}

export function motionWindows(clip: Pick<Clip, "duration" | "enter" | "leave" | "enterDur" | "leaveDur">) {
  const dur = Math.max(0.2, clip.duration);
  const enter = clip.enter ?? "none";
  const leave = clip.leave ?? "none";
  let enterSpan = enter === "none" ? 0 : windowOf(clip.enterDur, dur);
  let leaveSpan = leave === "none" ? 0 : windowOf(clip.leaveDur, dur);
  if (enterSpan + leaveSpan > dur * 0.92 && enterSpan + leaveSpan > 0) {
    const scale = (dur * 0.92) / (enterSpan + leaveSpan);
    enterSpan *= scale;
    leaveSpan *= scale;
  }
  return { dur, enterSpan, leaveSpan };
}

export function clipMotion(
  clip: Pick<Clip, "duration" | "enter" | "middle" | "leave" | "enterDur" | "leaveDur">,
  local: number,
  opts?: { skipEnter?: boolean },
): MotionFrame {
  const enter = opts?.skipEnter ? "none" : (clip.enter ?? "none");
  const middle = clip.middle ?? "none";
  const leave = clip.leave ?? "none";
  if (enter === "none" && middle === "none" && leave === "none") return STILL;

  const windows = motionWindows({ ...clip, enter, leave });
  const frame: MotionFrame = { dx: 0, dy: 0, scale: 1, rot: 0, alpha: 1, blur: 0 };

  if (enter !== "none" && windows.enterSpan > 0 && local < windows.enterSpan) {
    mixIn(frame, enter, 1 - ease(local / windows.enterSpan));
  }
  if (leave !== "none" && windows.leaveSpan > 0 && local > windows.dur - windows.leaveSpan) {
    mixOut(frame, leave, 1 - ease((windows.dur - local) / windows.leaveSpan));
  }
  if (middle !== "none") mixMid(frame, middle, local, windows.dur);
  return frame;
}

function ease(p: number) {
  const x = Math.max(0, Math.min(1, p));
  return x * x * (3 - 2 * x);
}

function mixIn(m: MotionFrame, kind: EnterId, k: number) {
  if (k <= 0) return;
  const p = 1 - k;
  if (kind === "fade") m.alpha *= 1 - k;
  else if (kind === "zoom") {
    m.scale *= 1 + 0.38 * k;
    m.alpha *= 1 - 0.45 * k;
  } else if (kind === "left") {
    m.dx -= 0.62 * k;
    m.alpha *= 1 - 0.2 * k;
  } else if (kind === "right") {
    m.dx += 0.62 * k;
    m.alpha *= 1 - 0.2 * k;
  } else if (kind === "up") {
    m.dy -= 0.48 * k;
    m.alpha *= 1 - 0.2 * k;
  } else if (kind === "down") {
    m.dy += 0.48 * k;
    m.alpha *= 1 - 0.2 * k;
  } else if (kind === "spin") {
    m.rot -= 26 * k;
    m.scale *= 1 - 0.18 * k;
    m.alpha *= 1 - 0.35 * k;
  } else if (kind === "pop") {
    m.scale *= 1 - 0.46 * k;
    m.alpha *= 1 - 0.55 * k;
  } else if (kind === "blur") {
    m.blur = 22 * k;
    m.alpha *= 1 - 0.15 * k;
  } else if (kind === "bounce") {
    m.scale *= 0.62 + 0.38 * p + Math.sin(p * Math.PI) * 0.16;
    m.alpha *= 1 - 0.4 * k;
  } else if (kind === "drop") {
    m.dy -= 0.72 * k;
    m.scale *= 1 + Math.sin(p * Math.PI) * 0.08;
    m.alpha *= 1 - 0.25 * k;
  } else if (kind === "glitch") {
    m.dx += Math.sin(k * 48) * 0.06 * k;
    m.dy += Math.cos(k * 31) * 0.03 * k;
    m.alpha *= 0.55 + 0.45 * (1 - k);
    m.scale *= 1 + 0.06 * k;
  }
}

function mixOut(m: MotionFrame, kind: LeaveId, k: number) {
  if (k <= 0) return;
  if (kind === "fade") m.alpha *= 1 - k;
  else if (kind === "zoom") {
    m.scale *= 1 + 0.3 * k;
    m.alpha *= 1 - k;
  } else if (kind === "left") m.dx -= 0.7 * k;
  else if (kind === "right") m.dx += 0.7 * k;
  else if (kind === "up") m.dy -= 0.55 * k;
  else if (kind === "down") m.dy += 0.55 * k;
  else if (kind === "spin") {
    m.rot += 26 * k;
    m.alpha *= 1 - k;
  } else if (kind === "pop") {
    m.scale *= 1 - 0.4 * k;
    m.alpha *= 1 - k;
  } else if (kind === "blur") {
    m.blur = Math.max(m.blur, 18 * k);
    m.alpha *= 1 - 0.7 * k;
  } else if (kind === "bounce") {
    m.scale *= 1 - 0.35 * k;
    m.dy += 0.28 * k;
    m.alpha *= 1 - k;
  } else if (kind === "glitch") {
    m.dx += Math.sin(k * 52) * 0.08 * k;
    m.alpha *= 1 - 0.85 * k;
  }
  if (kind !== "fade" && kind !== "zoom" && kind !== "spin" && kind !== "pop" && kind !== "blur" && kind !== "glitch" && kind !== "bounce") {
    m.alpha *= 1 - 0.35 * k;
  }
}

function mixMid(m: MotionFrame, kind: MidId, local: number, dur: number) {
  if (kind === "pulse") m.scale *= 1 + Math.sin(local * 6.2) * 0.04;
  else if (kind === "shake") {
    m.dx += Math.sin(local * 28) * 0.014;
    m.dy += Math.cos(local * 23) * 0.012;
  } else if (kind === "sway") m.rot += Math.sin(local * 2.4) * 3.2;
  else if (kind === "flicker") m.alpha *= 0.78 + 0.22 * (0.5 + 0.5 * Math.sin(local * 17));
  else if (kind === "ken") m.scale *= 1 + 0.1 * Math.max(0, Math.min(1, local / dur));
}
