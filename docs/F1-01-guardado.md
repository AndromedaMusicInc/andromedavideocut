# F1-01 · Guardado a prueba de fallas (0.0.6, primera tanda)

## Lo que ya está
- **Autoguardado**: ya existía. Guarda 400 ms después de cada cambio, y además al cerrar o cambiar de proyecto.
- **Escritura atómica en PC**: se escribe un `.tmp`, se hace **fsync** y luego un rename. Antes de cada guardado se copia el archivo anterior a `<id>.json.bak`. Si el `.json` principal está dañado, se abre desde el `.bak`.
- **Puntos de control (historial de versiones)**: se crean al abrir el proyecto, cada 2 minutos de edición, con Ctrl+S y justo antes de restaurar. Se conservan los 30 últimos, y nunca se borra el último manual.
  - En PC se guardan en `userData/projects/history/<id>/<ts>.json`, con un `index.json`.
  - En web se guardan en IndexedDB, en `avc-versions`.
  - Para verlos: **Ayuda → Historial de versiones…** Restaurar primero guarda el estado actual.
- **Recuperación tras un crash**: al abrir se pone la marca `avc.session.<id>`, que se quita al cerrar bien. Si al abrir sigue puesta, la app avisa y abre el último autoguardado (como mucho se pierden unos 400 ms).
- Al borrar un proyecto se borra también su historial.

## Falta (siguientes tandas)
1. **Medios fuera de IndexedDB en PC**: copiarlos a `userData/media` con escritura atómica. Hoy los blobs viven en el IndexedDB de Electron.
2. **OPFS en web** para proyectos grandes. Hoy el proyecto va en localStorage, con un límite de unos 5 MB y un aviso si se llena.
3. **Medios que solo usa una versión**: si se borra un medio que ya no está en el proyecto actual, una versión vieja lo marca como "Falta el archivo". Habría que contar las referencias de las versiones al limpiar.
4. **Diálogo de recuperación con opciones** ("abrir autoguardado" / "elegir versión") en lugar de solo un aviso. Además: comparar versiones con miniatura, ponerles nombre manual y añadir "Historial" al menú nativo de PC.
5. Detectar un archivo `.tmp` huérfano al arrancar y ofrecerlo si es más nuevo y es válido.
