# Historial de cambios

Todas las versiones de AndromedaVideoCut para escritorio. Formato: [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
versionado [SemVer](https://semver.org/lang/es/).

> **Numeración:** la **1.0.0 será el lanzamiento oficial**. Hasta entonces las versiones son **betas 0.0.x**.
> Las primeras pruebas publicadas como 1.0.0 y 1.0.1 se renumeran como betas: **1.0.0 → beta 0.0.0**,
> **1.0.1 → beta 0.0.1**, y la que iba a ser 1.0.2 es la **beta 0.0.2**. Quien instaló una 1.0.x no recibe la beta
> por actualización automática (no se baja de versión): debe desinstalarla e instalar la 0.0.2 a mano. Sus proyectos se
> conservan (carpeta de datos de la app).

## [0.0.2] — 2026-10-22 · Beta (antes 1.0.2)
Beta de arreglos (sin funciones grandes nuevas). La app y el instalador muestran **"Beta 0.0.2"**.
### Cambiado
- **Icono** con esquinas redondeadas (fondo transparente fuera de la curva) en el instalador, la ventana, la barra de
  tareas y el favicon de la web.
- **Pantalla de inicio** con diseño propio: botón compacto **Nuevo proyecto**, accesos rápidos en chips, proyectos
  recientes al centro y **Lo nuevo de Andromeda** en un panel lateral (noticias, lanzamientos y playlists).
- **Biblioteca (filtros, looks, efectos, stickers, texto, audio, fundidos y medios)**: un clic **ya no agrega nada** a la
  línea de tiempo. El clic muestra una **vista previa** en el visor (filtro/efecto sobre el clip seleccionado o el que
  está bajo el cabezal, texto o sticker encima, el audio suena unos segundos). Se quita al hacer clic en otra parte o con
  Esc. Para usarlo hay que **arrastrarlo** a la línea de tiempo o a un clip. Se quitó el "+" que ponía fundidos solo.
### Agregado
- Botón **Separar visor** visible en la esquina del visor. En la PC: elegir monitor, **pantalla completa en ese
  monitor**, recuerda posición y pantalla, y **Volver a acoplar**. En la web abre una ventana emergente
  (elegir monitor: "más opciones en la versión de PC").
- **Ctrl+S / Cmd+S guarda** el proyecto (antes cortaba el clip; la tecla S sola sigue cortando).
- **Barra de uso de Grok esta semana** (panel Generar y Ajustes → IA): cuenta los pedidos de IA hechos desde esta app,
  se reinicia cada lunes, y muestra el límite por minuto solo cuando xAI lo informa. Bloqueada sin cuenta conectada.
### Arreglado
- Si no se puede guardar (almacenamiento lleno), ahora sale un **aviso visible** en vez de fallar en silencio.
- Al cerrar la ventana/pestaña o cambiar de proyecto ya **no se pierde el último cambio** (se guarda al instante).

## [0.0.1] — 2026-10-22 · Beta (publicada como 1.0.1, prueba temprana)
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

## [0.0.0] · Beta (publicada como 1.0.0, prueba temprana) — 2026-10-22
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
