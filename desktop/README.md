# AndromedaVideoCut para Windows (Electron)

Empaqueta el build estático (`../preview`) en una app de escritorio. Se sirve por el protocolo `app://`
(los módulos ES no cargan desde `file://`). Todo funciona sin conexión; solo las fuentes de Google Fonts
se descargan de internet (sin red se usan fuentes del sistema).

## Generar el instalador (desde Linux)
```bash
cd /workspace/andromeda-videocut && npm run build      # actualiza preview/
cd desktop && npm install
npm run dist:win                                       # requiere wine (apt install wine wine64 wine32:i386)
```
Salida: `desktop/dist/AndromedaVideoCut-Setup-<versión>-x64.exe` (NSIS x64, con asistente, accesos
directos en el escritorio y en el menú Inicio, instalación por usuario, ícono `build/icon.ico`).
Desde Windows el mismo `npm run dist:win` funciona sin wine.

## Probar
- `npm start`: abre la app en Linux o Windows.
- `AVC_SMOKE=/ruta/captura.png npm start`: prueba de humo (captura y sale).

## Sin firmar
El instalador NO está firmado: Windows SmartScreen mostrará "Editor desconocido" (Más información →
Ejecutar de todas formas). Para firmar hace falta un certificado de firma de código (CSC_LINK / CSC_KEY_PASSWORD).
