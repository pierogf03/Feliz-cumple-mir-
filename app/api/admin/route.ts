import { z } from "zod";
import {
  authorize,
  ensureStore,
  responseHeaders,
  removeUnreferenced,
  saveSettings,
  upsertMemory,
  deleteMemory,
  reorderMemories,
  upsertTimeline,
  deleteTimeline,
  reorderTimeline,
  upsertReason,
  deleteReason,
  reorderReasons,
} from "@/lib/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const safeUrl = z
  .string()
  .max(2048)
  .refine(
    (v) =>
      !v ||
      /^\/api\/media\/[a-f0-9-]{36}$/.test(v) ||
      v === "/romantic-rose-letter.webp" ||
      (() => {
        try {
          const u = new URL(v);
          return u.protocol === "https:" && !u.username && !u.password;
        } catch {
          return false;
        }
      })(),
    "Usa una URL HTTPS directa al archivo.",
  );
const date = z
  .string()
  .refine(
    (v) => !v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v))),
    "Fecha inválida.",
  );
const memory = z
  .object({
    id: z.string().min(1).max(80),
    type: z.enum(["photo", "video", "gif", "text"]),
    media_url: safeUrl,
    thumbnail_url: safeUrl,
    title: z.string().max(180),
    description: z.string().max(4000),
    date,
    sort_order: z.number().int().min(0).max(10000),
    visible: z.union([z.literal(0), z.literal(1)]),
    style: z.enum(["paper", "wine"]),
    size: z.enum(["small", "medium", "large"]),
  })
  .refine(
    (m) =>
      m.type === "text"
        ? !!(m.title.trim() || m.description.trim())
        : !!m.media_url,
    "Agrega un archivo o una frase.",
  );
const moment = z.object({
  id: z.string().min(1).max(80),
  date,
  title: z.string().min(1).max(180),
  description: z.string().max(4000),
  media_url: safeUrl,
  sort_order: z.number().int().min(0).max(10000),
});
const reason = z.object({
  id: z.string().min(1).max(80),
  text: z.string().min(1).max(300),
  sort_order: z.number().int().min(0).max(10000),
});
const setting = z
  .object({
    birthday_date: z
      .string()
      .refine(
        (v) =>
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-05:00$/.test(v) &&
          !isNaN(Date.parse(v)),
        "La fecha debe usar la hora de Lima (UTC−05:00).",
      ),
    main_message: z.string().min(1).max(300),
    intro: z.string().max(1000),
    letter_content: z.string().max(50000),
    audio_url: safeUrl,
    cover_url: safeUrl,
    timeline_enabled: z.boolean(),
  })
  .partial()
  .strict();

export async function POST(req: Request) {
  try {
    const denied = await authorize(req);
    if (denied) return denied;
    if (Number(req.headers.get("content-length") || 0) > 200000)
      return Response.json(
        { error: "El texto es demasiado largo." },
        { status: 413 },
      );
    const body = await req.text();
    if (body.length > 200000)
      return Response.json(
        { error: "El texto es demasiado largo." },
        { status: 413 },
      );
    const input = z
      .object({
        action: z.enum(["save", "delete", "reorder"]),
        entity: z.enum(["memories", "timeline", "reasons", "settings"]),
        data: z.unknown().optional(),
        id: z.string().max(80).optional(),
        ids: z.array(z.string().max(80)).max(500).optional(),
      })
      .parse(JSON.parse(body));

    await ensureStore();

    if (input.entity === "settings") {
      if (input.action !== "save") throw new Error("Acción inválida.");
      const update = setting.parse(input.data);
      await saveSettings(update);
    } else if (input.action === "delete") {
      if (!input.id) throw new Error("Falta el elemento.");
      if (input.entity === "memories") {
        const old = await deleteMemory(input.id);
        if (old)
          await removeUnreferenced([old.media_url || "", old.thumbnail_url || ""]);
      } else if (input.entity === "timeline") {
        const old = await deleteTimeline(input.id);
        if (old?.media_url) await removeUnreferenced([old.media_url]);
      } else {
        await deleteReason(input.id);
      }
    } else if (input.action === "reorder") {
      const ids = input.ids || [];
      if (input.entity === "memories") await reorderMemories(ids);
      else if (input.entity === "timeline") await reorderTimeline(ids);
      else await reorderReasons(ids);
    } else if (input.entity === "memories") {
      const m = memory.parse(input.data);
      await upsertMemory(m);
    } else if (input.entity === "timeline") {
      await upsertTimeline(moment.parse(input.data));
    } else {
      await upsertReason(reason.parse(input.data));
    }

    return Response.json({ ok: true }, { headers: responseHeaders });
  } catch (e) {
    if (e instanceof z.ZodError)
      return Response.json({ error: e.issues[0].message }, { status: 400 });
    if (e instanceof SyntaxError)
      return Response.json({ error: "Contenido inválido." }, { status: 400 });
    console.error("Admin save failed", e);
    return Response.json(
      {
        error:
          "No se guardaron los cambios. Revisa los campos e inténtalo de nuevo.",
      },
      { status: 500 },
    );
  }
}
