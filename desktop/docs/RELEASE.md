# Publicar una versión (equipo técnico)

> **Regla:** nada se publica (push, release, GitHub Pages) sin un **OK nuevo y explícito de Wilhelm** para esa versión.

## 1. Subir la versión
1. Edita `desktop/package.json` → `"version"` (SemVer: `1.0.1` corrección, `1.1.0` función nueva, `2.0.0` cambio grande).
2. Agrega la sección nueva arriba en `desktop/CHANGELOG.md` y actualiza la versión en `desktop/README.md` si se menciona.
3. Commit: `git commit -am "desktop: v1.0.1"` y etiqueta `git tag v1.0.1` (local hasta el OK).

## 2. Compilar
```bash
cd /workspace/andromeda-videocut && npm run build     # genera preview/
cd desktop && npm ci
npm run dist:win                                      # NO publica (--publish never)
```
Desde Linux hace falta wine (`sudo apt install wine wine64`); desde Windows no.

Salida en `desktop/dist/`:
| Archivo | Para qué |
|---|---|
| `AndromedaVideoCut-Setup-X.Y.Z-x64.exe` | instalador |
| `AndromedaVideoCut-Setup-X.Y.Z-x64.exe.blockmap` | actualización diferencial |
| `latest.yml` | lo lee electron-updater para saber que hay versión nueva |

**Los tres** deben subirse al Release. Si falta `latest.yml`, las apps instaladas no ven la actualización.

### Verificaciones antes de publicar
- `node test/oauth-e2e.cjs` (con `xvfb-run -a` en Linux): IA bloqueada sin sesión, 403, éxito, código, desconectar.
- Prueba del updater (simula 1.0.0 → versión nueva contra un servidor local):
  ```bash
  npx electron-builder --win nsis --x64 --publish never -c.extraMetadata.version=1.0.1 -c.directories.output=/tmp/upd101
  cd /tmp/upd101 && cp latest.yml latest-linux.yml && python3 -m http.server 18790 --bind 127.0.0.1 &
  cd desktop && AVC_UPDATER_TEST=http://127.0.0.1:18790/ npx electron .
  ```
  Debe mostrar en consola: `disponible 1.0.1` → diálogo "Hay una nueva versión 1.0.1, ¿actualizar?" → `progreso 100%`
  → `descargada` → "Instalar y reiniciar". (`latest-linux.yml` solo hace falta al probar desde Linux.)
- Instalación silenciosa con wine: `wine dist/AndromedaVideoCut-Setup-X.Y.Z-x64.exe /S`. Con wine, el stub de PowerShell
  hace creer al instalador que la app está abierta (sale con código 2). Para la prueba, reemplaza
  `system32/WindowsPowerShell/v1.0/powershell.exe` y `syswow64/...` del prefijo de wine por un exe que devuelva 1.
  En Windows real no pasa.

## 3. Publicar (solo con el OK de Wilhelm)
Opción A, electron-builder sube el Release (como borrador) a `AndromedaMusicInc/andromedavideocut`:
```bash
cd desktop && GH_TOKEN=<token con permiso repo> npm run release:win
```
Luego, en GitHub → Releases, revisa el borrador `vX.Y.Z`, pega las notas del CHANGELOG y pulsa **Publish release**.

Opción B, con archivos ya compilados (`dist/release-X.Y.Z/`):
```bash
git push origin main --tags
gh release create vX.Y.Z desktop/dist/release-X.Y.Z/* --repo AndromedaMusicInc/andromedavideocut \
  --title "AndromedaVideoCut X.Y.Z" --notes-file <(sed -n '/## \[X.Y.Z\]/,/## \[/p' desktop/CHANGELOG.md)
```
No marques el release como *pre-release*: electron-updater (canal `latest`) lo ignoraría.

## 4. Firma de código (futuro)
Hoy el instalador **no está firmado** (por decisión: no se firma sin certificado propio de Andromeda Music Inc).
Cuando haya certificado:
1. Compra un certificado de firma de código a nombre de **Andromeda Music Inc** (OV, o EV/Azure Trusted Signing para
   eliminar SmartScreen desde el primer día).
2. Configura en CI: `CSC_LINK` (ruta o base64 del .pfx) y `CSC_KEY_PASSWORD`, o `win.azureSignOptions` para Trusted Signing.
3. Agrega `"signtoolOptions": { "publisherName": ["Andromeda Music Inc"] }` en `build.win`. A partir de esa versión,
   electron-updater exige que las actualizaciones estén firmadas por ese editor.
4. Nunca subas el certificado ni su contraseña al repositorio.

## IA: client_id de xAI (pendiente)
"Iniciar sesión con Grok" usa el OAuth público de xAI (`https://auth.x.ai`, descubrimiento OpenID en
`/.well-known/openid-configuration`): `/oauth2/authorize` con PKCE S256 y loopback `http://127.0.0.1:56121/callback`, con
`/oauth2/device/code` como respaldo, `/oauth2/token` para la renovación (el refresh token **rota** en cada uso) y
`/oauth2/revoke`. Alcances: `openid profile email offline_access api:access`.

**Qué falta:** un `client_id` OAuth **emitido por xAI para AndromedaVideoCut**, con el redirect
`http://127.0.0.1:56121/callback` y el grant de dispositivo habilitados. A la fecha (oct 2026) xAI **no documenta un registro
público** de clientes OAuth de terceros: hay que pedirlo a xAI (developers/soporte de x.ai). Hasta entonces el botón queda
deshabilitado con un aviso en español.

**Riesgo documentado, por eso NO se incluye:** las integraciones de referencia (Hermes, OpenCode, pi-xai, SeekerClaw)
reutilizan el client_id público de Grok CLI `b1a00492-073a-47ea-816f-4c329264a828`. Eso es hacerse pasar por la app oficial
de xAI. Puede violar los términos y la política de uso aceptable de xAI (bots que acceden "evitando medidas de protección"),
xAI puede revocarlo o bloquearlo en cualquier momento y puede afectar las cuentas de los usuarios. Además, ese cliente
puede devolver 403 en algunos planes. **No lo uses en una versión publicada** sin la aprobación por escrito de xAI.

Cómo configurarlo cuando exista (sin recompilar el código):
- `desktop/xai-oauth.json` (se empaqueta): `{ "clientId": "<id de xAI>" }`. Opcionales: `scope`, `port`.
- o `%APPDATA%/AndromedaVideoCut/xai-oauth.json` en un equipo, o la variable `AVC_XAI_CLIENT_ID` (pruebas).
- Si cambias el puerto, actualiza el redirect registrado en xAI.
- Si usas `xai-oauth.json`, agrégalo a `build.files` en `package.json`.

Seguridad: los tokens viven solo en el proceso main, cifrados con `safeStorage` (DPAPI) en `xai-session.bin` dentro de
userData. Nunca se registran en logs y solo se envían a auth.x.ai y api.x.ai. El renderer solo puede pedir
`/v1/models`, `/v1/stt`, `/v1/videos/generations` y `/v1/videos/{id}`, y descargar clips de `https://*.x.ai`.
