# AndromedaVideoCut para Windows

Editor de video de **Andromeda Music Inc.** para Reels, TikTok, Shorts y YouTube. Recorta, ajusta el ritmo,
agrega textos, stickers, filtros y música, y exporta en MP4.

## Requisitos
- Windows 10 u 11 de 64 bits.
- 4 GB de RAM (8 GB recomendados para videos 1080p largos) y unos 400 MB libres en disco.
- Internet solo para las actualizaciones, las fuentes de Google y la IA (opcional). Todo lo demás funciona sin conexión.

## Instalación
1. Descarga `AndromedaVideoCut-Setup-1.0.0-x64.exe` desde la página de Releases de Andromeda Music Inc.
2. Haz doble clic en el archivo.
3. **Aviso de Windows SmartScreen.** Como el instalador todavía no tiene firma digital, Windows puede mostrar
   "Windows protegió su PC". Haz clic en **Más información** y luego en **Ejecutar de todas formas**. Esto es normal
   en apps nuevas sin firmar. Descarga el instalador solo desde la página oficial de Andromeda Music Inc.
4. Sigue el asistente: Bienvenida → Contrato de licencia (acéptalo) → Carpeta de instalación (puedes cambiarla) → Instalar.
5. Al final, deja marcada **Ejecutar AndromedaVideoCut** y pulsa **Terminar**.

El instalador crea accesos directos en el escritorio y en el menú Inicio (carpeta *Andromeda Music Inc*).
No necesita permisos de administrador: se instala solo para tu usuario.

## Primeros pasos
- Se abre el proyecto de ejemplo **Mi primer reel**. Pulsa el botón de reproducir para verlo.
- Arrastra tus videos, fotos o música a la ventana.
- Atajos: **S** corta, **Supr** borra, **Ctrl+Z** deshace, **Espacio** reproduce o pausa.
- Elige el formato arriba: 9:16 Reels, 16:9 YouTube, 1:1 Post o 4:5 Feed.
- Pulsa **Exportar**, elige un preset (Reel/TikTok, Shorts 60, YouTube 1080p, Feed…) y guarda el MP4.

## Cómo conectar Grok (IA opcional)
La IA (**Transcribir voz** para la letra automática y **Generar video**) usa **tu propia cuenta de Grok**.
Sin conectarla, el editor funciona completo; solo esas dos funciones quedan con un candado.

Necesitas una suscripción activa: **SuperGrok, X Premium+ o X Subscription**.

1. Pulsa el engranaje (Ajustes) → **IA (opcional)** → **Conectar mi Grok**. También puedes pulsar cualquier candado de IA.
2. Se abre tu navegador. Inicia sesión en Grok (con Google, X, Apple o tu correo) y pulsa **Aprobar**.
3. Vuelve a la app. Verás **¡Conectado como tu nombre!** y la IA quedará desbloqueada.
4. Si el navegador no se abre o no vuelve, pulsa **Conéctate con un código**: abre la página que aparece en cualquier
   navegador (también en el celular) y escribe el código.

- Si ves *"Tu cuenta de Grok no tiene una suscripción activa (SuperGrok, X Premium+ o X Subscription). Suscríbete en x.ai
  para usar la IA."*, tu cuenta no tiene un plan que incluya este acceso. La IA sigue bloqueada hasta que te suscribas.
- **Desconectar:** Ajustes → IA (opcional) → **Desconectar**. La sesión se borra del equipo.
- Privacidad: la app nunca ve tu contraseña. La sesión se guarda cifrada con la protección de Windows y solo se envía a
  xAI (auth.x.ai y api.x.ai). Andromeda Music Inc no cobra ni paga el uso de la IA.
- En la versión web, la IA dice **"Disponible en la app de escritorio"**.

> Nota de la versión 1.0.0: el botón **Conectar mi Grok** aparece deshabilitado hasta que xAI habilite el inicio de
> sesión para AndromedaVideoCut. Llegará en una actualización automática.

## Actualizaciones
La app busca versiones nuevas al abrirse y cada 4 horas. Cuando hay una, pregunta *"Hay una nueva versión X, ¿actualizar?"*.
Si aceptas, la descarga en segundo plano (el progreso aparece en el título de la ventana y en la barra de tareas) y luego
te ofrece **Instalar y reiniciar**. También puedes buscarlas a mano en **Ayuda → Buscar actualizaciones…**. La versión
instalada aparece en **Ayuda → Acerca de**. Tus proyectos y ajustes se conservan.

## Desinstalar
**Configuración de Windows → Aplicaciones → Aplicaciones instaladas → AndromedaVideoCut → Desinstalar**
(o *Panel de control → Programas → Desinstalar un programa*). Aparece como "AndromedaVideoCut 1.0.0", de Andromeda Music Inc.

## Soporte
Escríbenos desde [andromedamusicinc.com](https://andromedamusicinc.com). Incluye tu versión (Ayuda → Acerca de) y,
si puedes, una captura del problema.

---
Equipo técnico: cómo compilar y publicar está en [docs/RELEASE.md](docs/RELEASE.md). Historial: [CHANGELOG.md](CHANGELOG.md).
