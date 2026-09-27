import { del, head, put } from "@vercel/blob";

function token() {
  const t = process.env.BLOB_READ_WRITE_TOKEN;
  if (!t) throw new Error("Storage unavailable");
  return t;
}

type PutOptions = {
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
};

export function bucket() {
  return {
    async put(
      id: string,
      body: ReadableStream<Uint8Array> | null,
      opts?: PutOptions,
    ) {
      if (!body) throw new Error("Empty body");
      await put(id, body, {
        access: "public",
        token: token(),
        addRandomSuffix: false,
        contentType: opts?.httpMetadata?.contentType,
      });
    },
    async delete(id: string) {
      await del(id, { token: token() });
    },
    async head(id: string) {
      try {
        const meta = await head(id, { token: token() });
        if (!meta) return null;
        return {
          size: meta.size,
          httpMetadata: { contentType: meta.contentType ?? undefined },
        };
      } catch {
        return null;
      }
    },
    async get(
      id: string,
      opts?: { range?: { offset: number; length: number } },
    ) {
      const meta = await head(id, { token: token() });
      if (!meta) return null;
      const headers: Record<string, string> = {};
      if (opts?.range) {
        const { offset, length } = opts.range;
        headers.Range = `bytes=${offset}-${offset + length - 1}`;
      }
      const res = await fetch(meta.url, { headers });
      if (!res.ok && res.status !== 206) return null;
      return { body: res.body };
    },
  };
}
