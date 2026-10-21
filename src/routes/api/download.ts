import { createFileRoute } from "@tanstack/react-router";

const files = new Map<string, { data: Uint8Array; name: string; type: string; at: number }>();

function clean(now: number) {
  for (const [id, file] of files) {
    if (now - file.at > 10 * 60 * 1000) files.delete(id);
  }
}

function idOf() {
  return Math.random().toString(36).slice(2, 10);
}

export const Route = createFileRoute("/api/download")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        clean(Date.now());
        const form = await request.formData().catch(() => null);
        const file = form?.get("file");
        const name = typeof form?.get("name") === "string" ? String(form?.get("name")) : "AndromedaVideoCut.mp4";
        if (!(file instanceof File) || file.size < 100 || file.size > 80_000_000) {
          return Response.json({ error: "No pude recibir el video." }, { status: 400 });
        }
        const id = idOf();
        files.set(id, {
          data: new Uint8Array(await file.arrayBuffer()),
          name: name.replace(/[^\w.\-]+/g, "-").slice(0, 60) || "AndromedaVideoCut.mp4",
          type: file.type || "video/mp4",
          at: Date.now(),
        });
        return Response.json({ id });
      },
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id") ?? "";
        const file = files.get(id);
        if (!file) return Response.json({ error: "El archivo ya no está." }, { status: 404 });
        return new Response(file.data.buffer as ArrayBuffer, {
          headers: {
            "Content-Type": file.type,
            "Content-Disposition": `attachment; filename="${file.name}"`,
            "Content-Length": String(file.data.byteLength),
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
