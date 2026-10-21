/** 16 kHz mono PCM WAV. Kept under a few megabytes so a transcription upload stays small. */
export function encodeWav(samples: Float32Array, sourceRate: number, maxSeconds: number) {
  const target = 16000;
  const maxIn = Math.max(1, Math.min(samples.length, Math.floor(maxSeconds * sourceRate)));
  const outLen = Math.max(1, Math.floor((maxIn / Math.max(1, sourceRate)) * target));
  const pcm = new Int16Array(outLen);
  for (let i = 0; i < outLen; i += 1) {
    const src = (i / target) * sourceRate;
    const i0 = Math.min(maxIn - 1, Math.floor(src));
    const i1 = Math.min(maxIn - 1, i0 + 1);
    const frac = src - i0;
    const sample = (samples[i0] ?? 0) * (1 - frac) + (samples[i1] ?? 0) * frac;
    const clamped = Math.max(-1, Math.min(1, sample));
    pcm[i] = clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
  }
  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, target, true);
  view.setUint32(28, target * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, pcm.length * 2, true);
  new Int16Array(buffer, 44).set(pcm);
  return buffer;
}
