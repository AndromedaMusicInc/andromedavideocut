import { mixer } from "@/lib/editor/audio";
import { audioEnvelope } from "@/lib/editor/time";
import type { Clip } from "@/lib/editor/types";

export function mixStereo(
  clips: Clip[],
  muted: Record<string, boolean>,
  duration: number,
  sampleRate: number,
) {
  const length = Math.max(1, Math.ceil(Math.max(0, duration) * sampleRate));
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  for (const clip of clips) {
    if (muted[clip.trackId]) continue;
    const buffer = mixer.bufferFor(clip);
    if (!buffer || buffer.length < 2) continue;
    const speed = clip.speed || 1;
    const srcL = buffer.getChannelData(0);
    const srcR = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : srcL;
    const srcRate = buffer.sampleRate || sampleRate;
    const from = Math.max(0, Math.floor(clip.start * sampleRate));
    const to = Math.min(length, Math.ceil((clip.start + clip.duration) * sampleRate));
    for (let i = from; i < to; i += 1) {
      const time = i / sampleRate;
      const gain = clip.volume * audioEnvelope(clip, time);
      if (gain <= 0) continue;
      const srcIndex = (clip.inPoint + (time - clip.start) * speed) * srcRate;
      const i0 = Math.floor(srcIndex);
      if (i0 < 0 || i0 >= srcL.length - 1) continue;
      const frac = srcIndex - i0;
      left[i] += ((srcL[i0] ?? 0) * (1 - frac) + (srcL[i0 + 1] ?? 0) * frac) * gain;
      right[i] += ((srcR[i0] ?? 0) * (1 - frac) + (srcR[i0 + 1] ?? 0) * frac) * gain;
    }
  }
  for (let i = 0; i < length; i += 1) {
    left[i] = Math.max(-1, Math.min(1, left[i] ?? 0));
    right[i] = Math.max(-1, Math.min(1, right[i] ?? 0));
  }
  return { left, right };
}
