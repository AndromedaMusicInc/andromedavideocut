#!/usr/bin/env bash
# 0.0.3: genera medios de prueba pequeños (2 s, < 5 MB c/u) en /workspace/avc-testmedia con el ffmpeg del sistema.
# Video en "vídeos de prueba", audio en "audios de prueba" (rutas con espacios y acentos a propósito).
set -euo pipefail
R=${AVC_TESTMEDIA:-/workspace/avc-testmedia}; V="$R/vídeos de prueba"; A="$R/audios de prueba"; mkdir -p "$V" "$A"
F="ffmpeg -hide_banner -loglevel error -y"
SRC="-f lavfi -i testsrc2=s=640x360:r=30:d=2 -f lavfi -i sine=f=440:r=48000:d=2"
v(){ out="$V/$1"; shift; [ -s "$out" ] || $F $SRC -shortest "$@" "$out"; }
v "h264 normal.mp4"      -c:v libx264 -pix_fmt yuv420p -c:a aac
v "h264 iphone.mov"      -c:v libx264 -pix_fmt yuv420p -c:a aac
v "hevc 8bit.mp4"        -c:v libx265 -pix_fmt yuv420p -tag:v hvc1 -c:a aac
v "hevc 10bit nikon.mov" -c:v libx265 -pix_fmt yuv420p10le -tag:v hvc1 -c:a pcm_s16le
v "h264 10bit.mp4"       -c:v libx264 -pix_fmt yuv420p10le -c:a aac
v "prores 422.mov"       -c:v prores_ks -profile:v 2 -c:a pcm_s24le
v "prores 4444.mov"      -c:v prores_ks -profile:v 4 -pix_fmt yuva444p10le -c:a pcm_s16le
v "dnxhd.mxf"            -vf scale=1920:1080,fps=30000/1001 -c:v dnxhd -b:v 45M -pix_fmt yuv422p -c:a pcm_s16le -ar 48000
v "dnxhr hq.mov"         -c:v dnxhd -profile:v dnxhr_hq -pix_fmt yuv422p -c:a pcm_s16le
v "xdcam mpeg2.mxf"      -c:v mpeg2video -b:v 8M -c:a pcm_s16le
v "avchd.mts"            -c:v libx264 -pix_fmt yuv420p -c:a ac3 -f mpegts
v "h264.mkv"             -c:v libx264 -pix_fmt yuv420p -c:a libopus
v "hevc.mkv"             -c:v libx265 -pix_fmt yuv420p -c:a flac
v "mjpeg.avi"            -c:v mjpeg -q:v 4 -c:a pcm_s16le
v "xvid.avi"             -c:v mpeg4 -q:v 4 -c:a libmp3lame
v "vp9.webm"             -c:v libvpx-vp9 -deadline realtime -cpu-used 8 -c:a libopus
v "av1.mp4"              -c:v libsvtav1 -preset 12 -c:a aac
v "windows.wmv"          -c:v wmv2 -c:a wmav2
v "sin audio.mp4"        -an -c:v libx264 -pix_fmt yuv420p
# RAW de cámara: solo cabeceras (no hay codificador libre); sirven para probar los mensajes.
[ -s "$V/RED clip.R3D" ] || { printf 'RED2\0\0\0\0R3D-header-only-test' > "$V/RED clip.R3D"; }
[ -s "$V/Nikon NRAW.NEV" ] || { printf '\0\0\0\x18ftypnev1-header-only-test' > "$V/Nikon NRAW.NEV"; }
a(){ out="$A/$1"; shift; [ -s "$out" ] || $F -f lavfi -i "sine=f=330:d=3" -f lavfi -i "sine=f=550:d=3" -filter_complex "[0][1]amerge=inputs=2" "$@" "$out"; }
a "wav 16 44k1 estereo.wav"  -ar 44100 -c:a pcm_s16le
a "wav 24 96k.wav"           -ar 96000 -c:a pcm_s24le
a "wav 32f 192k.wav"         -ar 192000 -c:a pcm_f32le
a "wav 24 48k mono.wav"      -ac 1 -ar 48000 -c:a pcm_s24le
a "wav 5.1 48k.wav"          -ar 48000 -c:a pcm_s16le -ac 6
a "rf64.wav"                 -ar 48000 -c:a pcm_s24le -rf64 always
a "bwf bext.wav"             -ar 48000 -c:a pcm_s24le -write_bext 1 -metadata coding_history="A=PCM,F=48000,W=24,M=stereo"
a "mp3 cbr 320.mp3"          -c:a libmp3lame -b:a 320k
a "mp3 vbr.mp3"              -c:a libmp3lame -q:a 4
a "aac.m4a"                  -c:a aac -b:a 192k
a "alac.m4a"                 -c:a alac
a "flac 24 96k.flac"         -ar 96000 -sample_fmt s32 -c:a flac
a "vorbis.ogg"               -c:a libvorbis
a "opus.opus"                -c:a libopus
a "aiff 24.aiff"             -c:a pcm_s24be
a "wma.wma"                  -c:a wmav2
a "ac3 5.1.ac3"              -ac 6 -c:a ac3
a "caf pcm.caf"              -c:a pcm_s16le
# RF64 de "más de 4 GB": solo la cabecera (ds64 dice 5 GB de datos, el archivo pesa unos bytes). Debe dar un mensaje, no colgarse.
python3 - "$A/rf64 5GB solo cabecera.wav" <<'PY'
import struct,sys
data=5*1024**3; fmt=struct.pack('<HHIIHH',1,2,48000,48000*4,4,16)
h=b'RF64'+struct.pack('<I',0xFFFFFFFF)+b'WAVE'+b'ds64'+struct.pack('<I',28)+struct.pack('<QQQI',data+36,data,data//4,0)+b'fmt '+struct.pack('<I',16)+fmt+b'data'+struct.pack('<I',0xFFFFFFFF)+bytes(48000*4)
open(sys.argv[1],'wb').write(h)
PY
du -sh "$V" "$A"; ls "$V" "$A" | wc -l
head -c 50000 /dev/urandom > "$A/corrupto.mp3"  # debe dar error visible
