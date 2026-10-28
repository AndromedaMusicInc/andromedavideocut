#!/usr/bin/env bash
# FFmpeg para Mac (arm64 y x64) desde eugeneware/ffmpeg-static b6.1.1, en vendor/ffmpeg/mac-<arch>/bin.
# Binarios estáticos (licencia GPL; ver LICENSE en cada carpeta). Requisito antes de `npm run dist:mac`.
set -euo pipefail
cd "$(dirname "$0")/.."
B=https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1
for a in arm64 x64; do
  d=vendor/ffmpeg/mac-$a; rm -rf "$d"; mkdir -p "$d/bin"
  for t in ffmpeg ffprobe; do curl -fsSL "$B/$t-darwin-$a.gz" | gunzip > "$d/bin/$t"; chmod +x "$d/bin/$t"; done
  curl -fsSL "$B/darwin-$a.LICENSE" -o "$d/LICENSE.txt"
  file "$d/bin/ffmpeg" 2>/dev/null || true
done
