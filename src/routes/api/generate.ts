import { createFileRoute } from "@tanstack/react-router";

const ASPECTS = new Set(["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"]);
const ready = new Map<string, string>();
let lastStart = 0;

function mapAspect(raw: unknown) {
  if (raw === "4:5") return "3:4";
  if (typeof raw === "string" && ASPECTS.has(raw)) return raw;
  return "9:16";
}

function cleanPrompt(raw: unknown) {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, 400);
}

function isVideoUrl(raw: string) {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && (url.hostname === "x.ai" || url.hostname.endsWith(".x.ai"));
  } catch {
    return false;
  }
}

async function readJob(apiKey: string, id: string) {
  const res = await fetch(`https://api.x.ai/v1/videos/${id}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return { status: "failed" as const, error: "No se pudo consultar el clip." };
  const body = (await res.json()) as {
    status?: string;
    video?: { url?: string };
    error?: { message?: string };
  };
  const url = body.video?.url;
  if (body.status === "done" && url && isVideoUrl(url)) ready.set(id, url);
  return {
    status: body.status === "done" || body.status === "failed" || body.status === "expired" ? body.status : "pending",
    error: typeof body.error?.message === "string" ? body.error.message.slice(0, 180) : undefined,
  };
}

export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const headerKey = request.headers.get("x-xai-key")?.trim();
        const apiKey = headerKey && headerKey.length > 12 ? headerKey : process.env.XAI_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "Falta tu clave de Grok. Entra en Generar y pégala." }, { status: 401 });
        }
        const now = Date.now();
        if (now - lastStart < 20000) {
          return Response.json({ error: "Espera unos segundos antes de generar otro clip." }, { status: 429 });
        }
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          payload = {};
        }
        const data = payload && typeof payload === "object" ? (payload as { prompt?: unknown; aspect?: unknown }) : {};
        const prompt = cleanPrompt(data.prompt);
        if (prompt.length < 8) {
          return Response.json({ error: "Describe el clip en una frase." }, { status: 400 });
        }
        lastStart = now;
        let res: Response;
        try {
          res = await fetch("https://api.x.ai/v1/videos/generations", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "grok-imagine-video-1.5-lite",
              prompt,
              duration: 6,
              aspect_ratio: mapAspect(data.aspect),
              resolution: "720p",
              generate_audio: false,
            }),
          });
        } catch {
          lastStart = 0;
          return Response.json({ error: "No hubo conexión para generar. Prueba un clip de estudio." }, { status: 502 });
        }
        if (!res.ok) {
          lastStart = 0;
          return Response.json({ error: "No se pudo empezar ese clip. Cambia la frase e inténtalo otra vez." }, { status: 502 });
        }
        const body = (await res.json()) as { request_id?: unknown };
        if (typeof body.request_id !== "string" || !/^[a-zA-Z0-9-]{8,80}$/.test(body.request_id)) {
          lastStart = 0;
          return Response.json({ error: "La generación no devolvió un pedido válido." }, { status: 502 });
        }
        return Response.json({ requestId: body.request_id });
      },
      GET: async ({ request }) => {
        const headerKey = request.headers.get("x-xai-key")?.trim();
        const apiKey = headerKey && headerKey.length > 12 ? headerKey : process.env.XAI_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "Falta tu clave de Grok." }, { status: 401 });
        }
        const url = new URL(request.url);
        const id = url.searchParams.get("id") ?? "";
        if (!/^[a-zA-Z0-9-]{8,80}$/.test(id)) {
          return Response.json({ error: "Pedido inválido." }, { status: 400 });
        }
        const wantFile = url.searchParams.get("file") === "1";
        let videoUrl = ready.get(id);
        if (!videoUrl) {
          let job: Awaited<ReturnType<typeof readJob>>;
          try {
            job = await readJob(apiKey, id);
          } catch {
            return Response.json({ error: "No hubo conexión para consultar el clip." }, { status: 502 });
          }
          if (job.status !== "done") {
            if (wantFile) return Response.json({ error: "El clip todavía no está listo." }, { status: 409 });
            return Response.json({ status: job.status, error: job.status === "pending" ? undefined : job.error });
          }
          videoUrl = ready.get(id);
        }
        if (!wantFile) return Response.json({ status: "done" });
        if (!videoUrl) return Response.json({ error: "No encontré el archivo del clip." }, { status: 404 });
        let file: Response;
        try {
          file = await fetch(videoUrl);
        } catch {
          return Response.json({ error: "No se pudo bajar el clip." }, { status: 502 });
        }
        if (!file.ok || !file.body) {
          return Response.json({ error: "No se pudo bajar el clip." }, { status: 502 });
        }
        const length = Number(file.headers.get("content-length") ?? "0");
        if (length > 28_000_000) {
          return Response.json({ error: "Ese clip pesa demasiado para meterlo en la línea." }, { status: 413 });
        }
        return new Response(file.body, {
          headers: {
            "Content-Type": "video/mp4",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
