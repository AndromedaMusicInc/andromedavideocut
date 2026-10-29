# Historial de cambios

Todas las versiones de AndromedaVideoCut para escritorio. Formato: [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
versionado [SemVer](https://semver.org/lang/es/).

> **Numeración:** la **1.0.0 será el lanzamiento oficial**. Hasta entonces las versiones son **betas 0.0.x**.
> Las primeras pruebas publicadas como 1.0.0 y 1.0.1 se renumeran como betas: **1.0.0 → beta 0.0.0**,
> **1.0.1 → beta 0.0.1**, y la que iba a ser 1.0.2 es la **beta 0.0.2**. Quien instaló una 1.0.x no recibe la beta
> por actualización automática (no se baja de versión): debe desinstalarla e instalar la 0.0.2 a mano. Sus proyectos se
> conservan (carpeta de datos de la app).

## [0.0.10] — 2026-10-29 · Beta
Beta de arreglos (guardado a prueba de fallas, segunda tanda). La app muestra "Beta 0.0.10". Windows y Mac a la par.
### Arreglado
- **Versiones viejas sin archivos:** quitar un medio de la biblioteca ya no borra su archivo, así que deshacer o restaurar
  una versión del historial lo recupera. Al borrar un proyecto solo se eliminan los archivos que ningún otro proyecto ni
  ninguna versión de su historial usa.
- **Guardado interrumpido (PC):** si la app se cortó justo al guardar y quedó un archivo temporal completo y más nuevo,
  al abrir el proyecto se recupera ese guardado; si estaba a medias, se descarta.

## [0.0.9] — 2026-10-28 · Beta
La app muestra "Beta 0.0.9". Windows y Mac salen a la par con el mismo número.
### Añadido
- **Primera versión para Mac:** instaladores `.dmg` (y `.zip`) para Mac con chip Apple (M1–M4, arm64) y para Mac Intel (x64).
  Es beta **sin firma de Apple**: la primera vez, abre la app con **clic derecho > Abrir**.
- **Actualizaciones en Mac:** la app avisa cuando hay una versión nueva y abre la descarga (no se instala sola).
- Enlaces de descarga de nombre fijo para el website (Windows y Mac).

## [0.0.8] — 2026-10-28 · Beta
La app muestra "Beta 0.0.8".
### Cambiado
- **Panel del clip en pestañas:** Colores, Entrada-Medio-Salida, Ajustes (sub-pestañas Básico y Quitar fondo) y Filtros.
  Cada grupo de controles va en una sección plegable con botón para restablecer, y los valores numéricos se pueden
  escribir o ajustar con flechas.
- **Buzón de sugerencias:** ahora solo envía por correo (se quitó el enlace a GitHub).
### Añadido
- **Versión web:** botón "Descargar para PC" en Inicio y en Ayuda, que lleva a la última versión publicada.

## [0.0.7] — 2026-10-28 · Beta
Beta de arreglo. La app muestra "Beta 0.0.7".
### Arreglado
- **Proyectos guardados que abrían en negro:** los canales creados al soltar un clip entre dos canales no se guardaban,
  así que al reabrir el proyecto sus clips no se veían ni sonaban. Ahora el proyecto guarda el orden de sus canales y,
  al abrirlo, los rearma. Los proyectos ya guardados se arreglan solos al abrirlos; si tenían varios canales nuevos,
  el orden entre ellos (cuál queda encima) podría variar.

## [0.0.6] — 2026-10-27 · Beta
Beta de arreglos y seguridad del trabajo. La app muestra "Beta 0.0.6".
### Arreglado
- **Mismo canal:** ya se pueden agregar o copiar más videos o efectos en un canal que ya tiene contenido (arrastrar
  desde la miniatura ya no cancela el arrastre y la zona para crear canal nuevo es más fina).
- **Logo de la biblioteca** visible también en la vista previa web.
- **Guía de transiciones**: marca el corte donde de verdad se aplicará la transición.
### Agregado
- **Buzón de sugerencias**: envía ideas o problemas por correo o como reporte en GitHub.
- **Guardado a prueba de fallas**: historial de versiones (puntos de control), recuperación tras un cierre inesperado
  y copia de respaldo (.bak) en PC.
- **Atajos**: `?` muestra la hoja de atajos; `[` `]` `Q` `W` para recortar, y avance/recorte cuadro por cuadro.
- **Aviso del instalador** si detecta una versión 1.0.x instalada (debe desinstalarse para recibir las betas).

## [0.0.5] — 2026-10-24 · Beta
Beta con pantalla de inicio, ojito por pista y guía al arrastrar. La app muestra "Beta 0.0.5".
### Agregado
- **Pantalla de inicio estilo FL Studio (B17).** En PC: ventana propia sin bordes, transparente, centrada y siempre
  encima, visible mientras carga la app; se cierra con un fundido cuando el editor está listo. En web: la misma imagen
  centrada sobre fondo oscuro (1.6 s). Se salta con clic o cualquier tecla, sale una vez por sesión, no aparece si el
  sistema tiene activado "reducir movimiento" y se apaga en **Ajustes → Animación de inicio**.
- **Ojito por pista**: oculta o muestra una pista en el visor y en la exportación sin borrarla. Se guarda con el
  proyecto y se puede deshacer.
- **Línea fina de inserción** entre canales al arrastrar, para ver dónde se creará el canal nuevo.

## [0.0.4] — 2026-10-22 · Beta
Beta de arreglos de la línea de tiempo: **el imán y las transiciones**. La app muestra "Beta 0.0.4".
### Arreglado
- **El imán no pegaba los clips** a los bordes de otros clips ni al cabezal. Al mover un clip se comparaba la
  posición "pegada por el inicio" con la "pegada por el final" contra la posición cruda, y la opción sin pegar
  (distancia 0, o casi 0 por redondeo) siempre ganaba. Ahora se elige el borde que de verdad tocó un punto de imán
  (bordes de clips, cabezal, beats, inicio). También al mover una selección de varios clips y al tocar la regla.
- **Las transiciones "no hacían nada":**
  - Soltarla a más de 0.55 s del corte la aplicaba en silencio a otro clip (a veces el primero, que no tiene clip
    antes). Ahora va al corte más cercano (~24 px) o, si cae encima de un clip, a su corte de entrada o salida; si no
    hay ningún corte, la app lo dice.
  - El clic (vista previa) se dibujaba en el cabezal y no se veía si el cabezal no estaba en el corte. Ahora la vista
    previa repite en bucle el tramo del corte más cercano.
  - Mensaje de confirmación: "Barrido en el corte de 3.0 s".

## [0.0.3] — 2026-10-22 · Beta
Beta de arreglos de importación: **videos y audios de la PC que no se veían ni sonaban**. La app muestra "Beta 0.0.3".
### Arreglado
- **Los videos importados no se veían en el visor.** Causa: el visor dibuja desde un grupo de reproductores
  (`pool`) que nunca se llenaba — nadie llamaba a `pool.warm()` al importar ni al abrir un proyecto — así que el clip
  aparecía en Medios y en la línea de tiempo pero el visor lo dibujaba en blanco. Ahora cada medio importado o
  restaurado tiene su reproductor.
- **Los audios importados no sonaban hasta reabrir el proyecto**: el audio solo se decodificaba al abrir el proyecto,
  no al importar. Ahora se decodifica al importar (archivo de audio o pista de un video).
- Archivos de audio sin tipo MIME en Windows (FLAC, Opus, WMA, AC3, CAF…) se tomaban como video. Ahora se detectan
  por la extensión.
- **Tarjeta del proyecto en Inicio** decía "0.0K | 00:00" sin miniatura: ahora muestra tamaño, duración reales y la
  miniatura del primer clip.
### Agregado
- **App de PC: FFmpeg 8.1 LGPL incluido.** Lo que Chromium no puede leer (HEVC 8/10-bit de Nikon y celulares, ProRes,
  DNxHD/DNxHR, MXF, AVCHD/MTS, MKV con HEVC, AVI, WMV, MPEG-2) se convierte solo, en segundo plano y con barra de
  progreso, a un **proxy H.264** para editar. **La exportación usa el original** (copia maestra a resolución completa).
- **Audio en todos los formatos**: WAV 16/24/32f de 44.1 a 192 kHz, mono/estéreo/5.1, RF64/BWF, MP3 CBR/VBR, AAC/M4A,
  FLAC, Ogg, Opus directo; ALAC, AIFF, WMA, AC3 y CAF se convierten a WAV 48 kHz. Forma de onda real en Medios y en la
  línea de tiempo. Si la conversión falla, aviso visible. Aviso de WAV/RF64 incompleto.
- **RED R3D**: si tienes REDCINE-X PRO instalado se convierte con REDline; si no, mensaje claro de qué hacer.
  **Nikon N-RAW y ProRes RAW**: mensaje con la recomendación de convertir con NX Studio o DaVinci Resolve.
- **Web**: aviso "más formatos en la versión de PC" y mensaje claro en lugar de un clip en blanco.
- **Registro de importación** (códec, contenedor, resultado y error): Ayuda → Abrir registro de importación de medios.
- Matriz completa en `docs/FORMATOS.md`.

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
