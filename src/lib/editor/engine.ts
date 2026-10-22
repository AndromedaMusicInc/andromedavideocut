import { mixer } from "@/lib/editor/audio";
import { playback } from "@/lib/editor/playback";
import { pool } from "@/lib/editor/pool";
import { useEditor } from "@/lib/editor/store";
import { contentEnd } from "@/lib/editor/time";

let frameSink: ((time: number) => void) | null = null;

export function setFrameSink(fn: ((time: number) => void) | null) {
  frameSink = fn;
}

mixer.onRunning = () => {
  // El dispositivo arrancó tarde: reprograma desde el tiempo actual para que sí suene.
  if (!playback.playing) return;
  const state = useEditor.getState();
  mixer.playFrom(playback.time, state.clips, state.muted);
};

export function play() {
  const { clips } = useEditor.getState();
  const end = contentEnd(clips);
  if (end <= 0.05) return;
  if (playback.time >= end - 0.04) playback.setTime(0);
  playback.playing = true;
  useEditor.setState({ playing: true, time: playback.time });
  void mixer.resume().then(() => {
    if (!playback.playing) return;
    const state = useEditor.getState();
    mixer.playFrom(playback.time, state.clips, state.muted);
  });
}

export function pause() {
  playback.playing = false;
  mixer.stop();
  useEditor.setState({ playing: false, time: playback.time });
}

export function togglePlay() {
  if (playback.playing) pause();
  else play();
}

export function seek(time: number) {
  const end = Math.max(contentEnd(useEditor.getState().clips) + 2, 0);
  playback.setTime(Math.min(Math.max(0, time), end));
  useEditor.setState({ time: playback.time });
  const state = useEditor.getState();
  if (playback.playing) mixer.playFrom(playback.time, state.clips, state.muted);
  else pool.sync(playback.time, false, state.clips);
}

export function startEngine(drawPreview: (time: number) => void) {
  let last = performance.now();
  let raf = 0;
  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (playback.playing) {
      const end = contentEnd(useEditor.getState().clips);
      const next = playback.time + dt;
      if (next >= end) {
        // Mantener el último fotograma visible (los clips terminan justo en `end`).
        playback.setTime(Math.max(0, end - 1 / 60));
        pause();
      } else {
        playback.setTime(next);
      }
    }
    const state = useEditor.getState();
    mixer.updateGains(playback.time, state.clips, state.muted);
    pool.sync(playback.time, playback.playing, state.clips);
    drawPreview(playback.time);
    frameSink?.(playback.time);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}

if (typeof window !== "undefined") (window as unknown as { __avcSeek?: (t: number) => void }).__avcSeek = (t: number) => seek(t);
