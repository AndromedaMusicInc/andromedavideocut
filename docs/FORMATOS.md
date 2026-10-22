# Formatos compatibles — AndromedaVideoCut Beta 0.0.3

Probado el 2026-10-22 con archivos reales generados por `desktop/test/make-media.sh` (en `/workspace/avc-testmedia`,
rutas con espacios y acentos). PC = app de escritorio (Electron 45 / Chromium + FFmpeg 8.1 LGPL incluido).
Web = navegador (Chrome). En la web, lo que no se puede leer muestra **"Formato no compatible en la web: … Más formatos en
la versión de PC"**; nunca queda un clip en blanco.

Leyenda: **Directo** = lo lee Chromium tal cual · **Proxy** = la PC crea en segundo plano una copia H.264 para editar
(con barra de progreso) y **exporta desde el original** (copia maestra a resolución completa, hasta 4K, 40 Mb/s) ·
**WAV** = la PC convierte el audio a WAV 48 kHz con FFmpeg · **Mensaje** = no se puede; la app explica qué hacer.

## Video

| Formato / códec | Contenedor | PC | Web (Chrome) |
|---|---|---|---|
| H.264 8-bit (cámaras, celulares, iPhone) | MP4, MOV, M4V, MKV | Directo | Directo |
| H.264 10-bit | MP4 | Directo | Directo |
| VP8 / VP9 | WebM | Directo | Directo |
| AV1 | MP4, WebM | Directo | Directo |
| HEVC/H.265 8-bit (iPhone, Android) | MP4, MOV, MKV | Proxy | Mensaje (solo si el equipo no lo decodifica) |
| HEVC/H.265 10-bit (Nikon Z, Sony, Canon, DJI) | MOV, MP4 | Proxy | Mensaje |
| Apple ProRes 422 / HQ / LT / Proxy / 4444 | MOV | Proxy | Mensaje |
| Avid DNxHD / DNxHR | MXF, MOV | Proxy | Mensaje |
| XDCAM / MPEG-2 | MXF | Proxy | Mensaje |
| AVCHD (H.264 + AC-3) | MTS, M2TS | Proxy (por el contenedor y el audio AC-3) | Mensaje |
| Motion JPEG, Xvid/DivX (MPEG-4 Part 2) | AVI | Proxy | Mensaje |
| WMV | WMV/ASF | Proxy | Mensaje |
| Video sin pista de audio | cualquiera | Directo/Proxy, sin aviso de audio | igual |
| **RED R3D** | R3D | Con **REDCINE-X PRO** instalado: REDline lo convierte (ProRes Proxy) y luego proxy. Sin él: **Mensaje** "Instala REDCINE-X PRO (gratis, de RED)… o exporta ProRes/H.264 desde REDCINE-X o DaVinci Resolve". No se descarga ni se acepta ninguna licencia por el usuario. | Mensaje |
| **Nikon N-RAW** | NEV | **Mensaje**: "Convierte con NX Studio / DaVinci Resolve, o instala REDCINE-X PRO (lee N-RAW)". Si REDline está instalado se intenta con él. | Mensaje |
| **ProRes RAW** | MOV | **Mensaje**: convertir con DaVinci Resolve / Final Cut Pro (no hay decodificador libre) | Mensaje |
| BRAW, ARRIRAW, Canon RAW | BRAW, ARI, CRM | Mensaje (convertir con el programa de la cámara o DaVinci Resolve) | Mensaje |

Proxy: H.264 por GPU si existe (NVENC, Quick Sync, AMF) o **OpenH264**; si nada funciona, VP9. Máximo 1080p para editar
fluido. Audio del proxy AAC estéreo 48 kHz.

## Audio

Comprobado por archivo: importa, **forma de onda real**, búfer en el mezclador, **suena por la salida elegida**
(nivel del bus maestro que va a la tarjeta de audio), **sincronía** (sonido dentro del clip, silencio en los huecos,
medido en el MP4 exportado) y **AAC** en la exportación.

| Formato | PC | Web (Chrome) |
|---|---|---|
| WAV PCM 16 / 24-bit, 32-bit float, 44.1–192 kHz | Directo | Directo |
| WAV mono, estéreo, 5.1 | Directo (5.1 se mezcla a estéreo) | Directo |
| RF64 / BWF (BEXT) | Directo | Directo |
| RF64 de más de 4 GB | WAV (FFmpeg, archivos de más de 400 MB); máximo 3 h por archivo, si no, mensaje | Mensaje si no cabe en memoria |
| WAV/RF64 incompleto (cabecera dice más datos que el archivo) | Importa lo que hay + **aviso "Archivo incompleto"** | igual |
| MP3 CBR / VBR | Directo | Directo |
| AAC / M4A | Directo | Directo |
| FLAC (hasta 24-bit/96 kHz) | Directo | Directo |
| Ogg Vorbis, Opus | Directo | Directo |
| ALAC (M4A) | WAV | Mensaje |
| AIFF / AIFC | WAV | Mensaje |
| WMA | WAV | Mensaje |
| AC-3 (Dolby Digital) 5.1 | WAV | Mensaje |
| CAF | WAV | Mensaje |
| Audio dentro de videos (AAC, PCM, AC-3, Opus, FLAC, MP3, WMA) | Directo o WAV | Directo si Chrome lo lee |
| Archivo dañado / no es audio | **Error visible** "No se pudo leer el audio… ffmpeg: …" | Mensaje |

## Registro

Cada importación queda en el registro con archivo, tamaño, tipo MIME, contenedor, códec de video/audio, bits,
resolución, rotación, duración, resultado (ok / proxy / convertido / error) y el error. PC:
`%APPDATA%\AndromedaVideoCut\logs\medios.log` (Ayuda → Abrir registro de importación de medios). Web: consola
del navegador (`[medios]`).

## Pruebas

- `desktop/test/media-e2e.cjs` (PC, video), `desktop/test/audiomedia-e2e.cjs` (PC, audio + sincronía + AAC),
  `desktop/test/webmedia.py` (web, video + tarjeta de Inicio), `desktop/test/webaudio.py` (web, audio).
- Medios: `desktop/test/make-media.sh` (todo < 5 MB por archivo; el RF64 de 5 GB es solo cabecera).
- Limitaciones de la prueba: los RAW (R3D, N-RAW) son solo cabeceras (no existe codificador libre); REDline no se probó
  porque no está instalado (y no se descarga). La caja de pruebas es Linux: el instalador de Windows se compila pero
  no se ejecutó en Windows. HEVC en la web depende del equipo (en Windows con GPU, Chrome suele leerlo).
