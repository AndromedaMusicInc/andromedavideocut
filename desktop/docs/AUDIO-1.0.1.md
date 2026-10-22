# Audio de la vista previa en 1.0.1: hallazgos

**Reporte:** en Windows, la vista previa de la 1.0.0 no suena.

**Cómo suena la vista previa:** todo el audio pasa por un mezclador Web Audio (AudioContext). Los videos van
silenciados y su audio se decodifica aparte. Si el AudioContext no está en "running" cuando se pulsa reproducir,
los sonidos se programan en un reloj detenido y no se oye nada.

**Lo que se probó (Linux, Electron 45, PulseAudio con sumidero virtual grabado con parec):**
- La 1.0.0 sí suena en Linux (RMS 0.156). El fallo de Windows no se pudo reproducir aquí: no hay Windows ni WASAPI.
- La 1.0.1 suena, Probar sonido da señal y el vúmetro se mueve (`test/audio-e2e.cjs`, `test/v101-e2e.cjs`).
- Exportación: H.264 + AAC 48 kHz estéreo (WASM, sin internet), media −15,6 dB, pico −4 dB; audio y video empiezan
  en 0 (el audio dura 37 ms más por el relleno de AAC).

**Causa más probable en Windows (deducida del código, no reproducida):**
`resume()` esperaba solo 1,2 s a que arrancara el AudioContext. En Windows, el primer arranque del dispositivo WASAPI
(sobre todo con Bluetooth o audífonos USB) puede tardar más. Pasado ese tiempo la reproducción se programaba con el
contexto aún suspendido y nunca se reprogramaba, así que quedaba en silencio. A eso se sumaban la política de autoplay
de Chromium y el posible envío a un dispositivo de salida distinto del esperado.

**Cambios:** espera de hasta 4 s, reprogramación al pasar a "running", desbloqueo con el primer clic o tecla,
`autoplayPolicy: no-user-gesture-required`, `backgroundThrottling: false`, selector Salida de audio (`setSinkId`,
recordado), vúmetro, Probar sonido y Ayuda → Diagnóstico de audio para confirmar en el equipo de Wilhelm.

**Pendiente:** confirmar en el Windows de Wilhelm con el instalador 1.0.1. Si no suena, enviar el Diagnóstico de audio.
