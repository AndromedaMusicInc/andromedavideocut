# Historial de cambios

Todas las versiones de AndromedaVideoCut para escritorio. Formato: [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
versionado [SemVer](https://semver.org/lang/es/).

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
