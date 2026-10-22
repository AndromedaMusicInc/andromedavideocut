# Lista de updates · AndromedaVideoCut (después de 1.0.1) · 22 oct 2026

Basada en el código (v1.0.1, commit 631ea17), CHANGELOG, backlogs de Mejoras (incluye `mejoras/2026-10-22.md`, marcados [M#]), propuestas de Visual, QA del 21 oct y referencias de CapCut.
Excluye lo ya planeado para 1.0.2: ícono con bordes curvos, inicio rediseñado, botón visible para separar el visor y clic = vista previa / arrastrar = añadir.
Formato: item — Prioridad — Plataforma — Versión. Lo "Solo PC" en la web muestra "más opciones en la versión de PC".

## Arreglos / estabilidad
1. Avisar cuando el autoguardado falla (localStorage lleno) y ofrecer liberar espacio [M1] — Alta — Web+PC — 1.0.2
2. Guardar al salir o al cambiar de proyecto (saveNow en cleanup y beforeunload/pagehide) [M2] — Alta — Web+PC — 1.0.2
3. Ctrl/Cmd+S = "Guardar ahora" en vez de dividir el clip y abrir el diálogo del navegador [M3] — Alta — Web+PC — 1.0.2
4. La vista previa queda negra al terminar: mostrar el último fotograma (QA #2) — Alta — Web+PC — 1.0.2
5. Confirmar AAC en Chrome/Edge/Safari web; si sale Opus o WebM, explicar por qué falló el MP4 [QA #1, M4] — Alta — Web+PC — 1.0.2
6. Respetar la calidad elegida en la exportación de respaldo (MediaRecorder fija 4.5 Mbps) [M5] — Media — Web+PC — 1.0.2
7. Pedir almacenamiento persistente (storage.persist) y mostrar el espacio libre en el inicio [M6] — Media — Web+PC — 1.0.2
8. Avisar de medios faltantes al abrir y ofrecer "Volver a vincular archivo" [M7] — Alta — Web+PC — 1.1
9. El globo de ayuda no debe tapar el lienzo en 16:9; moverlo a una esquina (QA #3, Visual #2) — Media — Web+PC — 1.0.2
10. El cabezal debe empezar en 0:00.0 al abrir un proyecto (QA #6) — Baja — Web+PC — 1.0.2
11. Los botones de la barra ("Borrar y correr", "Copiar/Pegar estilo") no deben partirse ni salirse a 1366 px (QA #6) — Media — Web+PC — 1.0.2
12. Ocultar el botón de pantalla completa cuando fullscreenEnabled sea false (iframe en Sites) (QA #5) — Baja — Web+PC — 1.0.2
13. Recuperación tras cierre inesperado: ofrecer restaurar la última copia — Alta — Web+PC — 1.1
14. Registro de errores local exportable desde Ayuda para reportar fallos — Media — Solo PC — 1.0.2
15. Firma digital del instalador para quitar el aviso de SmartScreen — Media — Solo PC — 1.1

## Línea de tiempo
16. Zoom con deslizador y "Ajustar a la ventana" (Ctrl + rueda) — Alta — Web+PC — 1.1
17. Pista principal magnética: cerrar huecos al borrar (activable) — Alta — Web+PC — 1.1
18. Enlazar/desenlazar audio y video del mismo clip — Media — Web+PC — 1.1
19. Clip compuesto: agrupar la selección y entrar a editarlo — Media — Web+PC — 1.2
20. Marcadores con nombre y color (tecla M) — Media — Web+PC — 1.1
21. Bloquear, ocultar y silenciar pistas completas — Media — Web+PC — 1.1
22. Selección por arrastre (lazo) en la línea de tiempo — Media — Web+PC — 1.0.2
23. Accesibilidad: foco y flechas para mover/recortar clips, anuncios aria-live, role="dialog" en Exportar [M9, QA #6] — Media — Web+PC — 1.1
24. Recorte ripple/roll con modificadores (Alt/Ctrl en los bordes) — Baja — Solo PC — 1.2
25. Alto de pistas ajustable y miniaturas continuas — Baja — Web+PC — 1.1

## Edición
26. Panel de propiedades con pestañas Video/Audio/Velocidad/Animación/Ajuste — Alta — Web+PC — 1.1
27. Transformar: escala, posición X/Y, rotación, volteo y Restablecer con valores numéricos — Alta — Web+PC — 1.1
28. Fotogramas clave para escala, posición, opacidad y volumen — Alta — Web+PC — 1.1
29. Recorte (crop) con relación de aspecto fija — Media — Web+PC — 1.1
30. Modos de fusión y opacidad por clip en el inspector — Media — Web+PC — 1.1
31. Congelar fotograma y reproducir al revés — Media — Web+PC — 1.1
32. Velocidad por curva (rampas tipo montage) — Media — Web+PC — 1.2
33. Máscaras lineal, circular y rectángulo con difuminado — Baja — Web+PC — 1.2
34. Historial de deshacer visible con su límite (hoy 60 pasos en silencio; 100 en PC) [M8] — Baja — Web+PC — 1.1
35. Estabilizar video local, sin nube — Baja — Solo PC — 1.2

## Audio
36. Normalizar volumen (−14 LUFS para Reels/TikTok) — Alta — Web+PC — 1.1
37. Fundido de entrada/salida con tiradores en el clip — Alta — Web+PC — 1.0.2
38. Ducking automático: bajar la música bajo la voz — Media — Web+PC — 1.1
39. Fundido cruzado entre clips de audio contiguos — Media — Web+PC — 1.1
40. Grabar voz en off desde el micrófono — Media — Web+PC — 1.1
41. Reducción de ruido para voces — Media — Solo PC — 1.2
42. Forma de onda detallada con caché en disco — Baja — Solo PC — 1.1
43. Selector de entrada de audio (micrófono/interfaz) — Baja — Solo PC — 1.1

## Texto / subtítulos
44. Importar .srt/.lrc a subtítulos editables (pedido de Vega) — Alta — Web+PC — 1.1
45. Estilo karaoke bold con palabra resaltada — Alta — Web+PC — 1.1
46. Pulso del texto al beat del audio — Media — Web+PC — 1.1
47. Exportar subtítulos como .srt — Media — Web+PC — 1.1
48. Plantillas de texto Andromeda (tipografías y colores del sello) — Media — Web+PC — 1.1
49. Contorno, sombra, fondo y espaciado editables por texto — Media — Web+PC — 1.1
50. Usar fuentes del sistema o propias — Baja — Solo PC — 1.2

## Efectos / filtros / transiciones
51. Intensidad ajustable (0–100 %) para cada filtro y efecto — Alta — Web+PC — 1.1
52. Favoritos y recientes en filtros, efectos y transiciones — Media — Web+PC — 1.1
53. Importar LUT .cube propias — Media — Web+PC — 1.1
54. Corrección de color con curvas y rueda de color — Media — Web+PC — 1.2
55. Croma / quitar fondo verde con tolerancia — Media — Web+PC — 1.2
56. Duración de transición arrastrable en la línea de tiempo — Baja — Web+PC — 1.1
57. Pack de efectos trap/lo-fi (VHS, grano, glitch al beat) — Baja — Web+PC — 1.2

## Exportación
58. Exportación nativa con FFmpeg y GPU (NVENC/QSV), H.264/AAC garantizado y en segundo plano [M10] — Alta — Solo PC — 1.1
59. Exportar 4K y 60 fps — Media — Solo PC — 1.1
60. Exportar solo audio (WAV/MP3) o solo un rango — Media — Web+PC — 1.1
61. Cola de exportación: 9:16, 16:9 y 1:1 de un clic — Media — Solo PC — 1.2
62. Bitrate personalizado con estimado de tamaño — Baja — Web+PC — 1.1
63. Exportar GIF o un fotograma como portada — Baja — Web+PC — 1.1

## Interfaz
64. Zonas seguras 9:16 de TikTok/Reels en el visor — Alta — Web+PC — 1.0.2
65. Componente único "más opciones en la versión de PC" en la web, en vez de botones que fallan [M12] — Media — Web+PC — 1.0.2
66. Botón de play dorado legible y logo nuevo en la barra (Visual #1) — Media — Web+PC — 1.0.2
67. Paleta Andromeda: negro/dorado/morado, cian solo para acciones (Visual) — Media — Web+PC — 1.1
68. Barra superior de 56 px con nombre de proyecto editable y relación de aspecto (Visual #3) — Media — Web+PC — 1.1
69. Paneles redimensionables que recuerden su tamaño — Media — Web+PC — 1.1
70. Atajos configurables y hoja de atajos (Ctrl+/) — Baja — Solo PC — 1.2

## Rendimiento
71. Proxies para videos grandes/4K leyendo desde la ruta local; exportar con el original [M11] — Alta — Solo PC — 1.1
72. Progreso de proxy en la biblioteca — Media — Solo PC — 1.1
73. Caché de miniaturas en disco (userData) — Media — Solo PC — 1.1
74. Calidad de vista previa (Completa/Media/Baja) para equipos lentos — Media — Web+PC — 1.1
75. Visor con WebGL en vez de canvas 2D para los efectos — Baja — Web+PC — 1.2

## Proyectos / archivos
76. Arrastrar archivos desde el Explorador directo a la línea de tiempo — Alta — Solo PC — 1.0.2
77. Abrir proyectos .avc con doble clic (asociación de archivo en Windows) — Media — Solo PC — 1.1
78. "Recopilar archivos": proyecto + medios en una carpeta o zip — Media — Solo PC — 1.1
79. Importar/exportar proyectos entre web y PC — Media — Web+PC — 1.2
80. Copias de seguridad automáticas con versiones — Baja — Solo PC — 1.1

## Andromeda (música / feed)
81. Biblioteca de música del sello con licencia para usar en videos (beats, lo-fi) — Alta — Web+PC — 1.1
82. Plantillas de reel para lanzamientos (portada + snippet + texto) — Media — Web+PC — 1.1
83. Beats de las canciones del sello precalculados en el feed — Media — Web+PC — 1.2
84. Aviso en el inicio de nuevos lanzamientos y playlists — Baja — Solo PC — 1.1
85. Marca de agua opcional "Hecho con AndromedaVideoCut" — Baja — Web+PC — 1.1

## IA (solo con la cuenta Grok del usuario)
86. Activar "Conectar mi Grok" cuando xAI apruebe el client_id (bloqueante) — Alta — Solo PC — 1.1
87. Subtítulos automáticos con Grok (transcripción) — Alta — Solo PC — 1.1
88. Ideas de caption y hashtags para el reel — Media — Solo PC — 1.1
89. Generar imágenes o fondos con Grok Imagine — Media — Solo PC — 1.2
90. Recorte inteligente: mejores momentos de un video largo — Baja — Solo PC — 1.2
91. Traducir subtítulos al inglés/portugués — Baja — Solo PC — 1.2
