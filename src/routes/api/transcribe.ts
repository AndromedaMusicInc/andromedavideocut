import { createFileRoute } from "@tanstack/react-router";

const MAX_BYTES = 4_000_000;
let lastCall = 0;

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.XAI_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "La transcripción no está disponible en este momento." }, { status: 503 });
        }
        const now = Date.now();
        if (now - lastCall < 6000) {
          return Response.json({ error: "Espera unos segundos antes de transcribir otra vez." }, { status: 429 });
        }
        const bytes = await request.arrayBuffer();
        if (bytes.byteLength < 1000) {
          return Response.json({ error: "El audio es demasiado corto." }, { status: 400 });
        }
        if (bytes.byteLength > MAX_BYTES) {
          return Response.json({ error: "Ese audio es muy largo. Transcribo hasta un minuto y medio." }, { status: 413 });
        }
        lastCall = now;
        const form = new FormData();
        form.append("model", "grok-voice-transcribe-2.0");
        form.append("language", "es");
        form.append("format", "true");
        form.append("file", new Blob([bytes], { type: "audio/wav" }), "audio.wav");
        let res: Response;
        try {
          res = await fetch("https://api.x.ai/v1/stt", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: form,
          });
        } catch {
          lastCall = 0;
          return Response.json({ error: "No hubo conexión para transcribir. Pega la letra a mano." }, { status: 502 });
        }
        if (!res.ok) {
          lastCall = 0;
          return Response.json({ error: "No se pudo leer la voz. Pega la letra a mano." }, { status: 502 });
        }
        const body = (await res.json()) as { text?: unknown; words?: unknown };
        const words = Array.isArray(body.words) ? body.words.slice(0, 2500) : [];
        return Response.json({
          text: typeof body.text === "string" ? body.text.slice(0, 8000) : "",
          words,
        });
      },
    },
  },
});
