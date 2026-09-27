import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { head, put } from "@vercel/blob";
import {
  defaults,
  defaultReasons,
  type Memory,
  type Moment,
  type Reason,
  type Settings,
} from "@/lib/content";
import { dataRoot } from "@/lib/local-paths";

export type Asset = {
  id: string;
  mime: string;
  size: number;
  created_at: string;
};

type StoreData = {
  settings: Settings;
  memories: Memory[];
  timeline: Moment[];
  reasons: Reason[];
  assets: Asset[];
  seeded: boolean;
};

const STORE_FILE = join(dataRoot, "store.json");
const BLOB_STORE_PATH = "store.json";

function emptyStore(): StoreData {
  return {
    settings: { ...defaults },
    memories: [],
    timeline: [],
    reasons: [],
    assets: [],
    seeded: false,
  };
}

function useBlobStore() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function blobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN!;
}

async function readBlobText(pathname: string): Promise<string | null> {
  try {
    const meta = await head(pathname, { token: blobToken() });
    if (!meta) return null;
    const res = await fetch(meta.url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function writeBlobText(pathname: string, text: string) {
  await put(pathname, text, {
    access: "public",
    token: blobToken(),
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

async function readStore(): Promise<StoreData> {
  if (useBlobStore()) {
    const raw = await readBlobText(BLOB_STORE_PATH);
    if (!raw) return emptyStore();
    return { ...emptyStore(), ...JSON.parse(raw) };
  }
  await mkdir(dataRoot, { recursive: true });
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    return { ...emptyStore(), ...JSON.parse(raw) };
  } catch {
    return emptyStore();
  }
}

async function writeStore(data: StoreData) {
  const text = JSON.stringify(data);
  if (useBlobStore()) {
    await writeBlobText(BLOB_STORE_PATH, text);
    return;
  }
  await mkdir(dataRoot, { recursive: true });
  const tmp = `${STORE_FILE}.${process.pid}.tmp`;
  await writeFile(tmp, text, "utf8");
  await rename(tmp, STORE_FILE);
}

export async function ensureStore() {
  const store = await readStore();
  if (store.seeded) return;
  store.settings = { ...defaults };
  store.reasons = defaultReasons.map((r) => ({ ...r }));
  store.seeded = true;
  await writeStore(store);
}

export async function getSettings(): Promise<Settings> {
  await ensureStore();
  const store = await readStore();
  return { ...defaults, ...store.settings };
}

export async function saveSettings(update: Partial<Settings>) {
  const store = await readStore();
  store.settings = { ...defaults, ...store.settings, ...update };
  store.seeded = true;
  await writeStore(store);
}

export async function listMemories(admin: boolean) {
  const store = await readStore();
  const items = [...store.memories].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      String(a.created_at).localeCompare(String(b.created_at)),
  );
  return admin ? items : items.filter((m) => m.visible === 1);
}

export async function listTimeline() {
  const store = await readStore();
  return [...store.timeline].sort(
    (a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id),
  );
}

export async function listReasons() {
  const store = await readStore();
  return [...store.reasons].sort((a, b) => a.sort_order - b.sort_order);
}

export async function hasConfiguredReasons() {
  const store = await readStore();
  return store.seeded || store.reasons.length > 0;
}

export async function upsertMemory(memory: Memory) {
  const store = await readStore();
  const existing = store.memories.find((m) => m.id === memory.id);
  const created_at =
    memory.created_at ?? existing?.created_at ?? new Date().toISOString();
  const next = { ...memory, created_at };
  const index = store.memories.findIndex((m) => m.id === memory.id);
  if (index >= 0) store.memories[index] = next;
  else store.memories.push(next);
  await writeStore(store);
}

export async function deleteMemory(id: string) {
  const store = await readStore();
  const old = store.memories.find((m) => m.id === id);
  store.memories = store.memories.filter((m) => m.id !== id);
  await writeStore(store);
  return old;
}

export async function reorderMemories(ids: string[]) {
  const store = await readStore();
  validateReorder(store.memories, ids);
  for (const [i, id] of ids.entries()) {
    const item = store.memories.find((m) => m.id === id);
    if (item) item.sort_order = i;
  }
  await writeStore(store);
}

export async function upsertTimeline(moment: Moment) {
  const store = await readStore();
  const index = store.timeline.findIndex((m) => m.id === moment.id);
  if (index >= 0) store.timeline[index] = moment;
  else store.timeline.push(moment);
  await writeStore(store);
}

export async function deleteTimeline(id: string) {
  const store = await readStore();
  const old = store.timeline.find((m) => m.id === id);
  store.timeline = store.timeline.filter((m) => m.id !== id);
  await writeStore(store);
  return old;
}

export async function reorderTimeline(ids: string[]) {
  const store = await readStore();
  validateReorder(store.timeline, ids);
  for (const [i, id] of ids.entries()) {
    const item = store.timeline.find((m) => m.id === id);
    if (item) item.sort_order = i;
  }
  await writeStore(store);
}

export async function upsertReason(reason: Reason) {
  const store = await readStore();
  const index = store.reasons.findIndex((r) => r.id === reason.id);
  if (index >= 0) store.reasons[index] = reason;
  else store.reasons.push(reason);
  store.seeded = true;
  await writeStore(store);
}

export async function deleteReason(id: string) {
  const store = await readStore();
  store.reasons = store.reasons.filter((r) => r.id !== id);
  await writeStore(store);
}

export async function reorderReasons(ids: string[]) {
  const store = await readStore();
  validateReorder(store.reasons, ids);
  for (const [i, id] of ids.entries()) {
    const item = store.reasons.find((r) => r.id === id);
    if (item) item.sort_order = i;
  }
  await writeStore(store);
}

function validateReorder<T extends { id: string }>(items: T[], ids: string[]) {
  if (ids.length !== items.length) {
    throw new Error("El álbum cambió. Actualiza el panel y vuelve a ordenar.");
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error("El álbum cambió. Actualiza el panel y vuelve a ordenar.");
  }
  if (items.some((item) => !ids.includes(item.id))) {
    throw new Error("El álbum cambió. Actualiza el panel y vuelve a ordenar.");
  }
}

export async function registerAsset(asset: Asset) {
  const store = await readStore();
  const index = store.assets.findIndex((a) => a.id === asset.id);
  if (index >= 0) store.assets[index] = asset;
  else store.assets.push(asset);
  await writeStore(store);
}

export async function removeAsset(id: string) {
  const store = await readStore();
  store.assets = store.assets.filter((a) => a.id !== id);
  await writeStore(store);
}

export async function isMediaUrlPublic(
  url: string,
  settings: Settings,
  unlocked: boolean,
) {
  if (settings.cover_url === url) return true;
  if (!unlocked) return false;
  if (settings.audio_url === url) return true;
  const store = await readStore();
  const inMemory = store.memories.some(
    (m) =>
      m.visible === 1 && (m.media_url === url || m.thumbnail_url === url),
  );
  if (inMemory) return true;
  if (!settings.timeline_enabled) return false;
  return store.timeline.some((t) => t.media_url === url);
}

export async function isMediaUrlReferenced(url: string, settings: Settings) {
  if (url === settings.cover_url || url === settings.audio_url) return true;
  const store = await readStore();
  return store.memories.some(
    (m) => m.media_url === url || m.thumbnail_url === url,
  ) || store.timeline.some((t) => t.media_url === url);
}
