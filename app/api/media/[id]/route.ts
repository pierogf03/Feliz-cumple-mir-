import {
  bucket,
  getSettings,
  isAdmin,
  isMediaUrlPublic,
} from "@/lib/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!/^[a-f0-9-]{36}$/.test(id)) return new Response(null, { status: 404 });
    const url = "/api/media/" + id;
    const admin = await isAdmin();
    if (!admin) {
      const settings = await getSettings();
      const unlocked = Date.now() >= Date.parse(settings.birthday_date);
      const allowed = await isMediaUrlPublic(url, settings, unlocked);
      if (!allowed) return new Response(null, { status: 404 });
    }
    const head = await bucket().head(id);
    if (!head) return new Response(null, { status: 404 });
    let offset = 0,
      length = head.size,
      status = 200;
    const range = req.headers.get("range");
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2]))
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${head.size}` },
        });
      if (!match[1]) {
        length = Math.min(Number(match[2]), head.size);
        offset = head.size - length;
      } else {
        offset = Number(match[1]);
        const end = match[2]
          ? Math.min(Number(match[2]), head.size - 1)
          : head.size - 1;
        length = end - offset + 1;
      }
      if (offset >= head.size || length < 1)
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${head.size}` },
        });
      status = 206;
    }
    const object = await bucket().get(id, { range: { offset, length } });
    if (!object) return new Response(null, { status: 404 });
    const headers = new Headers({
      "Content-Type":
        head.httpMetadata?.contentType || "application/octet-stream",
      "Content-Length": String(length),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    });
    if (status === 206)
      headers.set(
        "Content-Range",
        `bytes ${offset}-${offset + length - 1}/${head.size}`,
      );
    return new Response(object.body, { status, headers });
  } catch (e) {
    console.error("Media read failed", e);
    return new Response(null, { status: 503 });
  }
}
