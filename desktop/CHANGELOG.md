# Historial de cambios

Todas las versiones de AndromedaVideoCut para escritorio. Formato: [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
versionado [SemVer](https://semver.org/lang/es/).

## [1.0.1] — 2026-10-22
### Agregado
- **Varios proyectos**: lista con nombre, formato, miniatura, tamaño, duración y fecha. Crear, renombrar, duplicar,
  buscar, vista de cuadrícula o lista y Papelera con recuperación. En escritorio se guardan en la carpeta de datos de la
  app (`%APPDATA%/AndromedaVideoCut/projects`). El proyecto de la 1.0.0 se migra sin perder nada.
- **Pantalla de inicio** nueva: barra lateral (Inicio, Plantillas, Andromeda, Biblioteca, Ajustes, Buscar
  actualizaciones), botón Crear proyecto, accesos rápidos y sección **Lo nuevo de Andromeda** con lanzamientos,
  playlists, videos y noticias reales de Andromeda Music Inc. Se actualiza desde internet y funciona sin conexión.
- Botón para volver al inicio desde el editor.
- **Salida de audio**: elige altavoz o audífonos (o "Predeterminado del sistema"); se recuerda.
- **Vúmetro** junto al visor y botón **Probar sonido**.
- **Ayuda → Diagnóstico de audio…** con un botón para copiar el reporte.
- **Selección múltiple**: Ctrl+A (Cmd+A), Esc, Mayús/Ctrl+clic, arrastrar varios clips a la vez, borrar varios.
- **Menú contextual** en los clips: Copiar, Cortar, Pegar, Borrar, Dividir en el cabezal, Separar audio,
  Desactivar/activar, Duplicar, Reemplazar clip, Exportar clips seleccionados y Abrir ubicación del archivo.
- **Separar visor**: el visor en su propia ventana, en la pantalla que elijas, con pantalla completa y sin marco
  opcional; recuerda posición y monitor.

### Corregido
- **La vista previa no sonaba en algunos equipos con Windows.** El audio esperaba solo 1,2 s a que arrancara el
  dispositivo; con WASAPI el primer arranque puede tardar más y la reproducción quedaba programada en silencio.
  Ahora espera hasta 4 s, reprograma el audio en cuanto el dispositivo arranca, desbloquea el audio con el primer clic
  o tecla, permite autoplay en la ventana y no frena el audio cuando la ventana pierde el foco.
- El guardado automático no se activaba después de reabrir la app; ahora guarda siempre.
- La app de escritorio sirve los medios con soporte de rangos (206), necesario para buscar en videos largos.
- Proyectos con clips incompletos ya no hacen desaparecer la línea de tiempo al seleccionarlos.
- La interfaz del editor ya no selecciona texto al arrastrar o con Ctrl+A.

## [1.0.0] — 2026-10-22
Primera versión para Windows.

### Agregado
- Instalador profesional NSIS x64 con asistente: bienvenida, contrato de licencia en español, elección de carpeta,
  accesos directos en el escritorio y en el menú Inicio, opción "Ejecutar al terminar", imágenes de encabezado y barra
  lateral. Instalación por usuario, sin permisos de administrador.
- Desinstalador en "Agregar o quitar programas", con editor Andromeda Music Inc, ícono y versión.
- Actualizaciones automáticas desde GitHub Releases: búsqueda al iniciar y cada 4 horas, aviso en español antes de
  descargar y antes de instalar, progreso en la barra de tareas y actualización diferencial (blockmap).
- Menú Ayuda con "Buscar actualizaciones…" y "Acerca de" (muestra la versión).
- Presets de exportación (Reel/TikTok, Shorts 60, YouTube 1080p, Feed…) y MP4 con audio AAC en todos los equipos.
- **Iniciar sesión con Grok** (IA opcional): conexión con la cuenta y la suscripción de Grok del usuario mediante OAuth
  (navegador con PKCE y, como respaldo, código de dispositivo). La sesión se guarda cifrada y se renueva sola. Botones
  "Conectar mi Grok" y "Desconectar" en Ajustes → IA (opcional).

### Cambiado
- Toda la IA viene **bloqueada por defecto** con un candado: "Conecta tu cuenta de xAI/Grok para usar IA".
- La IA ya no usa el servidor ni la clave de Andromeda Music Inc: cada usuario usa su propia cuenta de Grok.
- En la versión web, la IA muestra "Disponible en la app de escritorio".

### Eliminado
- El backend de IA del sello (`/api/generate` y `/api/transcribe`, con `XAI_API_KEY`).
- La opción de pegar una clave de API.

### Conocido
- El instalador no tiene firma digital: Windows SmartScreen muestra un aviso la primera vez.
- "Conectar mi Grok" está deshabilitado hasta que xAI apruebe un client_id OAuth para AndromedaVideoCut (ver docs/RELEASE.md).
