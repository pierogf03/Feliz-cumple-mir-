import { createReadStream, createWriteStream } from "node:fs";
import { unlink, writeFile, stat, open, readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { del, head, put } from "@vercel/blob";
import { ensureDataDirs, localMediaPath } from "@/lib/local-paths";
import {
  canUseLocalDisk,
  hasBlobToken,
  requireBlobTokenForWrites,
  useBlobPersistence,
} from "@/lib/runtime-env";

type PutOptions = {
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
};

function useVercelBlob() {
  return useBlobPersistence() && hasBlobToken();
}

function blobToken() {
  const t = process.env.BLOB_READ_WRITE_TOKEN;
  if (!t) throw new Error("Storage unavailable");
  return t;
}

function metaPath(id: string) {
  return `${localMediaPath(id)}.meta.json`;
}

async function readMeta(id: string) {
  try {
    const raw = await readFile(metaPath(id), "utf8");
    return JSON.parse(raw) as { contentType?: string };
  } catch {
    return {};
  }
}

function localBucket() {
  return {
    async put(
      id: string,
      body: ReadableStream<Uint8Array> | null,
      opts?: PutOptions,
    ) {
      if (!body) throw new Error("Empty body");
      if (!canUseLocalDisk()) {
        requireBlobTokenForWrites();
      }
      await ensureDataDirs();
      const path = localMediaPath(id);
      const buffer = Buffer.from(await new Response(body).arrayBuffer());
      await writeFile(path, buffer);
      await writeFile(
        metaPath(id),
        JSON.stringify({
          contentType: opts?.httpMetadata?.contentType ?? "application/octet-stream",
        }),
      );
    },
    async delete(id: string) {
      await unlink(localMediaPath(id)).catch(() => {});
      await unlink(metaPath(id)).catch(() => {});
    },
    async head(id: string) {
      try {
        const info = await stat(localMediaPath(id));
        const meta = await readMeta(id);
        return {
          size: info.size,
          httpMetadata: { contentType: meta.contentType },
        };
      } catch {
        return null;
      }
    },
    async get(
      id: string,
      opts?: { range?: { offset: number; length: number } },
    ) {
      const filePath = localMediaPath(id);
      try {
        await stat(filePath);
      } catch {
        return null;
      }
      if (!opts?.range) {
        const stream = createReadStream(filePath);
        return { body: Readable.toWeb(stream) as ReadableStream<Uint8Array> };
      }
      const { offset, length } = opts.range;
      const handle = await open(filePath, "r");
      const stream = handle.createReadStream({ start: offset, end: offset + length - 1 });
      return { body: Readable.toWeb(stream) as ReadableStream<Uint8Array> };
    },
  };
}

function vercelBucket() {
  return {
    async put(
      id: string,
      body: ReadableStream<Uint8Array> | null,
      opts?: PutOptions,
    ) {
      if (!body) throw new Error("Empty body");
      await put(id, body, {
        access: "public",
        token: blobToken(),
        addRandomSuffix: false,
        contentType: opts?.httpMetadata?.contentType,
      });
    },
    async delete(id: string) {
      await del(id, { token: blobToken() });
    },
    async head(id: string) {
      try {
        const meta = await head(id, { token: blobToken() });
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
      const meta = await head(id, { token: blobToken() });
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

export function bucket() {
  return useVercelBlob() ? vercelBucket() : localBucket();
}
