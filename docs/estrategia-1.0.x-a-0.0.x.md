# Usuarios con 1.0.x que no reciben las betas 0.0.x (bug ALTA de QA)

## Qué pasa
- Las primeras pruebas se publicaron como **1.0.0** y **1.0.1**. Luego Wilhelm decidió que **la 1.0.0 será el lanzamiento** y
  las betas pasaron a **0.0.x**.
- electron-updater compara versiones: para una 1.0.1 instalada, `latest.yml` 0.0.5 es *más vieja* y ese código ya instalado
  tiene `allowDowngrade = false`. **No hay nada que podamos publicar en 0.0.x que la 1.0.x acepte sola.** Su código ya está en
  sus PCs; no se puede cambiar desde aquí.
- Afectados conocidos: instalaciones de prueba internas (Wilhelm). Las releases v1.0.1 se borraron el 22 oct.

## Lo que ya se hizo / se deja listo (sin publicar)
1. **Notas de cada release** (desde 0.0.4): "si tienes 1.0.x, desinstálala e instala esta a mano; tus proyectos se conservan".
2. **Instalador 0.0.6+ (`desktop/build/installer.nsh`, `customInit`)**: lee `DisplayVersion` del registro (HKCU/HKLM,
   clave de desinstalación de la app). Si empieza por `1.0.`, avisa *"Tienes instalada la versión de prueba 1.0.x; se
   reemplazará por la Beta 0.0.x; tus proyectos se conservan"* y sigue. electron-builder ya desinstala la versión anterior
   con el mismo appId antes de instalar, así que **no hace falta desinstalar a mano**: basta con bajar y ejecutar el
   instalador 0.0.x. Desde ahí, las actualizaciones automáticas funcionan.
   - Pendiente: probarlo en un Windows real con una 1.0.1 instalada (en el box solo se compila con NSIS/wine).

## Lanzamiento oficial: opciones (decide Wilhelm)
| Opción | Qué ven los de 1.0.x | Qué ven los de 0.0.x | Coste |
|---|---|---|---|
| **A. Lanzar como 1.0.0** (lo decidido) | Nada (1.0.0 < 1.0.1). Tienen que instalar a mano (con el aviso del instalador). | Se actualizan solos. | Ninguno; afecta solo a testers internos. |
| **B. Lanzar como 1.0.2** y mostrar "1.0" en la app | Se actualizan solos (1.0.2 > 1.0.1). | Se actualizan solos. | El número técnico no es "1.0.0". |
| **C. Lanzar como 1.1.0** | Se actualizan solos. | Se actualizan solos. | Se "salta" la 1.0.0. |

**Recomendación:** A si los únicos con 1.0.x son de Andromeda (lo más probable): que instalen la 0.0.6 a mano una vez y ya
quedan en la línea buena. Si hubo testers externos con 1.0.x, B: lanzar como **1.0.2** con la etiqueta "1.0" en la app.

## Lo que NO conviene
- Publicar una release "puente" con `latest.yml` 1.0.2 que en realidad instala una 0.0.x: las 0.0.x verían 1.0.2 como
  nueva y entrarían en un bucle de actualizaciones.
- Marcar releases como prerelease: con `allowPrerelease=false` nadie las recibe.
