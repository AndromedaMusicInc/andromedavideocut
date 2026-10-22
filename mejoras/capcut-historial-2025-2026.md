# Historial de CapCut ene 2025 – 22 oct 2026 · cruce con AndromedaVideoCut
Fuentes: tiendas oficiales, capcut.com y rastreadores de versiones (se indica cuando no es oficial). "Mant." = nota genérica "Fixed some known issues and improved the trimming experience".

## 1. Cronología resumida
- 2025 ene: sin datos. feb–ago: Escritorio 5.6 a 6.9 sin notas (https://windows.apkpure.com/capcut/versions , https://www.filepuma.com/kr/download/capcut_for_pc-1183/versions/page/2/); Android 13.8–15.0 y iOS 14.5–15.0 mant. (https://www.rustore.ru/catalog/app/com.lemon.lvoverseas/versions , https://www.ipa4fun.com/history/477148/).
- 2025-08-13: CapCut AI Suite en móvil (AutoCut, AI Clipper, transcripción, traductor, avatar, quitar fondo, etc.). https://www.capcut.com/resource/ai-editing-the-capcut-way
- 2025-09-12: Escritorio 7.0 (no oficial): plantillas de subtítulos, seguimiento de cámara, distribuciones del editor, borrado de objetos. https://www.gizdev.com/capcut-for-windows-and-mac/
- 2025 oct–dic: Escritorio 7.5–7.7 sin notas (https://capcut.en.uptodown.com/windows/versions); web Nano Banana Pro (24 nov) y ChatGPT 5 (9 dic) https://www.capcut.com/resource/new-release ; ayuda "Buscar actualizaciones" PC (24 dic) https://www.capcut.com/help/update-capcut-pc-for-latest-version
- 2026 ene–mar: Escritorio 7.8–8.3 sin notas; iOS 17.1 mant.
- 2026 abr–ago: Seedance 2.0/2.5, Seedream 5.0 Pro, MiniMax H3; web Director Mode, Design Studio 2.0, Gemini; CapCut Pad para tabletas (6 jun). https://creatorstoolbox.com/apps/capcut/news ; https://www.capcut.com/resource/seedance-2-5-is-now-on-capcut-pc
- 2026 sep–oct: EditPilot e Interactive Edit (10 sep); Mac 9.6.0 (19 oct); iOS 19.7–19.8.1 mant. https://apps.apple.com/us/app/capcut-photo-video-editor/id1500855883 ; normalizar audio y edición por transcripción (sin fecha) https://editlogic.io/capcut-updates/

Huecos: sin notas oficiales de escritorio 5.x–9.x (solo fechas); ene 2025 sin datos; la web no publica notas; notas móviles casi siempre genéricas.

## 2. Cruce con AndromedaVideoCut
| Novedad CapCut | Estado | Esfuerzo | Plataforma |
|---|---|---|---|
| Plantillas de subtítulos | Ya en la lista (#15) | M | Web + PC |
| Distribuciones del editor | Nuevo (rel. #18) | M | Web + PC |
| Seguimiento de un área | Nuevo (local) | L | Solo PC |
| Recorte de personas, borrar objetos, inpaint, AI Writer | Descartado (IA) | – | – |
| Recorte mejorado | Nuevo: paso por cuadro y borrado que cierra hueco (Editor.tsx:247-250) | S | Web + PC |
| Normalizar audio | Ya en la lista (#16) | M | Web + PC |
| Edición por transcripción, muletillas, subtítulos bilingües, AI Suite, quitar fondo | Descartado (IA) | – | – |
| Chroma key | Ya lo tenemos (types.ts:118-119) | – | – |
| Animaciones entrada/medio/salida | Ya lo tenemos (types.ts:45-48, 113-117) | – | – |
| Transiciones y filtros | Ya lo tenemos (types.ts:4-44) | – | – |
| Ajustes de color | Ya lo tenemos (types.ts:94-100) | – | – |
| Fotogramas clave | Nuevo (types.ts:127-130 son fijos) | L | Web + PC |
| Velocidad | En parte (types.ts:87) | – | – |
| Curvas de velocidad | Nuevo | L | Web + PC |
| Congelar cuadro | Nuevo | S | Web + PC |
| Reversa | Nuevo | M | Web + PC |
| Cámara lenta suave (FFmpeg minterpolate) | Nuevo | L | Solo PC |
| Estabilización (FFmpeg vidstab) | Nuevo | L | Solo PC |
| Importar fuentes locales | Nuevo | S | Web + PC |
| Extraer audio | Nuevo (verificar) | S | Web + PC |
| Export 4K 60 fps | Ya en la lista (#10) | L | Solo PC |
| Portada personalizada | Nuevo | S | Web + PC |
| Compartir en redes | Ya en la lista (#25) | M | Web + PC |
| Más relaciones de aspecto | Ya en la lista (#19) | S | Web + PC |
| Buscar actualizaciones PC | Ya lo tenemos (commit 5bae0a6, Welcome.tsx:319; sin verificar) | – | Solo PC |
| Proyecto que no abre tras actualizar | Nuevo: copia antes de migrar (v: 1) | S | Web + PC |
| CapCut Pad | Nuevo: modo tableta táctil | M | Web + PC |
| Plantillas de tendencia | Ya en la lista (#24) | M | Web + PC |
| Multipista | Ya lo tenemos (types.ts:153-158; verificar) | – | – |
| Modelos de IA generativa | Descartado (IA) | – | – |

## 3. Nuevas propuestas sin IA, por prioridad
1. P1 · Recorte preciso: paso por cuadro con , y ., borrar cerrando hueco, imán al cabezal. S · Web + PC
2. P1 · Copia de seguridad antes de migrar el formato del proyecto. S · Web + PC
3. ~~P1 · Congelar cuadro~~ Ya lo tenemos (store.ts:118-119)
4. P1 · Importar fuentes locales. S · Web + PC
5. P2 · Fotogramas clave de posición, escala, giro y opacidad. L · Web + PC
6. P2 · Distribuciones del editor guardables. M · Web + PC
7. P2 · Modo tableta táctil. M · Web + PC
8. P2 · Portada personalizada al exportar. S · Web + PC
9. ~~Extraer audio~~ Ya lo tenemos (separateAudio, store.ts:113)
10. ~~Reversa~~ Ya lo tenemos (store.ts:118-119; Timeline.tsx:246-247)
11. P3 · Curvas de velocidad. L · Web + PC
12. P3 · Estabilización (vidstab). L · Solo PC
13. P3 · Cámara lenta suave (minterpolate). L · Solo PC
14. P3 · Seguimiento de un área. L · Solo PC
