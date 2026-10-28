#!/usr/bin/env bash
# Descarga FFmpeg LGPL (BtbN/FFmpeg-Builds, rama 8.1, compartido) para Windows y Linux en desktop/vendor/ffmpeg,
# verificando el SHA256 publicado. No se guarda en git (pesa ~180 MB). Requisito antes de `npm run dist:win`.
set -euo pipefail
# Uso: fetch-ffmpeg.sh [win]  → con "win" solo baja Windows (CI).
ONLY=${1:-}
cd "$(dirname "$0")/.."
B=https://github.com/BtbN/FFmpeg-Builds/releases/download/latest
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
curl -fsSL "$B/checksums.sha256" -o "$T/checksums.sha256"
FILES="ffmpeg-n8.1-latest-win64-lgpl-shared-8.1.zip"; [ "$ONLY" = win ] || FILES="$FILES ffmpeg-n8.1-latest-linux64-lgpl-shared-8.1.tar.xz"
for f in $FILES; do
  curl -fsSL "$B/$f" -o "$T/$f"; (cd "$T" && grep " $f\$" checksums.sha256 | sha256sum -c -)
done
rm -rf vendor/ffmpeg/win vendor/ffmpeg/linux && mkdir -p vendor/ffmpeg
(cd "$T" && unzip -q ffmpeg-n8.1-latest-win64-lgpl-shared-8.1.zip)
mv "$T/ffmpeg-n8.1-latest-win64-lgpl-shared-8.1" vendor/ffmpeg/win
rm -f vendor/ffmpeg/win/bin/ffplay.exe
[ "$ONLY" = win ] && exit 0
(cd "$T" && tar xf ffmpeg-n8.1-latest-linux64-lgpl-shared-8.1.tar.xz)
mv "$T/ffmpeg-n8.1-latest-linux64-lgpl-shared-8.1" vendor/ffmpeg/linux
rm -f vendor/ffmpeg/linux/bin/ffplay
vendor/ffmpeg/linux/bin/ffmpeg -hide_banner -version | head -1
